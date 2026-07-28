import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  deriveGroupNameFromTexts,
  heuristicClusterNeeds,
  isLowQualityGroupName,
} from "@/lib/stages/stage5/categorizeNeedsHeuristic";

interface NeedPayload {
  id: string;
  text: string;
}

function parseNeeds(raw: unknown): NeedPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n) => n && typeof n === "object")
    .map((n) => {
      const o = n as Record<string, unknown>;
      return {
        id: String(o.id ?? "").trim(),
        text: String(o.text ?? "").trim(),
      };
    })
    .filter((n) => n.id && n.text);
}

function buildPrompt(needs: NeedPayload[]): string {
  const blocks = needs
    .map((n, i) => `[${i + 1}] id=${n.id}\n내용: ${n.text}`)
    .join("\n\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래는 잠재 니즈 목록입니다. **비슷한 내용끼리 모아 그룹으로 재분류**하고,
각 그룹에 **짧은 한국어 이름**을 붙이세요.

규칙:
- 모든 잠재 니즈 id를 정확히 한 그룹에만 넣습니다. 빠뜨리거나 중복하지 않습니다.
- 그룹 이름은 어피니티 다이어그램(스탠퍼드 d.school·닐슨노먼 그룹 방식) 클러스터 라벨처럼,
  묶인 니즈들에 공통된 근본 주제·심리를 1~4개 명사(구)로 표현합니다.
  좋은 예: 시간 압박, 정보 신뢰 부족, 자율성 욕구, 사회적 인정 욕구, 선택 피로, 보상 심리
- 니즈 문장에서 그대로 뽑은 단어를 이름으로 쓰지 않습니다. 특히 "위해서·하기 위해·싶다·하고·때문에"처럼
  Need Statement 문형을 이루는 연결어·어미는 이름에 절대 포함하지 않습니다.
  나쁜 예: "위해서 싶다", "하고 이렇게", "때문에 그런데" — 문장 조각·조사·어미 나열
- 그룹 수는 니즈 개수에 맞게 적당히(보통 2~6개). 1개만이면 1그룹도 가능.
- 결론·솔루션처럼 단정하지 말고, 니즈 묶음의 공통 주제를 이름으로 씁니다.
- JSON만 출력. 마크다운·설명 없음.

출력 형식:
{"groups":[{"name":"그룹이름","needIds":["id1","id2"]}]}

잠재 니즈:
${blocks}`;
}

function parseGroupsJson(
  text: string,
): Array<{ name: string; needIds: string[] }> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      groups?: Array<{ name?: string; needIds?: unknown }>;
    };
    if (!Array.isArray(parsed.groups)) return null;
    const groups = parsed.groups
      .map((g) => ({
        name: String(g.name ?? "").trim(),
        needIds: Array.isArray(g.needIds)
          ? g.needIds
              .map((id) => String(id ?? "").trim())
              .filter(Boolean)
          : [],
      }))
      .filter((g) => g.name && g.needIds.length > 0);
    return groups.length > 0 ? groups : null;
  } catch {
    return null;
  }
}

function normalizeGroups(
  groups: Array<{ name: string; needIds: string[] }>,
  needs: NeedPayload[],
): Array<{ name: string; needIds: string[] }> {
  const validIds = new Set(needs.map((n) => n.id));
  const textById = new Map(needs.map((n) => [n.id, n.text] as const));
  const used = new Set<string>();
  const cleaned: Array<{ name: string; needIds: string[] }> = [];

  for (const group of groups) {
    const needIds = group.needIds.filter((id) => {
      if (!validIds.has(id) || used.has(id)) return false;
      used.add(id);
      return true;
    });
    if (needIds.length === 0) continue;
    // AI가 "위해서·싶다" 같은 문형 연결어만으로 이름을 지으면 어피니티 그룹 텍스트 기반으로 재도출
    const name =
      group.name.trim() && !isLowQualityGroupName(group.name)
        ? group.name.slice(0, 40)
        : deriveGroupNameFromTexts(
            needIds.map((id) => textById.get(id) ?? ""),
          );
    cleaned.push({
      name: name || `그룹 ${cleaned.length + 1}`,
      needIds,
    });
  }

  const missing = needs.filter((n) => !used.has(n.id)).map((n) => n.id);
  if (missing.length > 0) {
    cleaned.push({
      name: "미분류",
      needIds: missing,
    });
  }

  return cleaned;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const projectId = String(record.projectId ?? "").trim();
  const needs = parseNeeds(record.needs);

  if (!projectId || needs.length === 0) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const heuristic = () => ({
    groups: normalizeGroups(heuristicClusterNeeds(needs), needs),
    source: "heuristic" as const,
  });

  if (!resolveGroqApiKey()) {
    return NextResponse.json(heuristic());
  }

  try {
    const result = await groqComplete(buildPrompt(needs), {
      models: resolveGroqTextModels(),
      temperature: 0.35,
      jsonMode: true,
    });
    const parsed = parseGroupsJson(result.text);
    if (!parsed?.length) {
      return NextResponse.json(heuristic());
    }
    return NextResponse.json({
      groups: normalizeGroups(parsed, needs),
      source: "groq",
    });
  } catch {
    return NextResponse.json(heuristic());
  }
}
