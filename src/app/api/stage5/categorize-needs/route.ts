import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { KOREAN_PRIMARY_OUTPUT_RULE } from "@/lib/coach/outputLanguage";
import {
  hasDisallowedForeignScript,
  sanitizeCoachKoreanText,
} from "@/lib/coach/sanitizeCoachKorean";
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

type GroupResult = { name: string; needIds: string[] };

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

const GROUP_NAME_RULE = `
- 그룹 이름은 어피니티 다이어그램(스탠퍼드 d.school·닐슨노먼 그룹 방식) 클러스터 라벨처럼,
  묶인 니즈들에 공통된 근본 주제·심리를 1~4개 명사(구)로 표현합니다.
  좋은 예: 시간 압박, 정보 신뢰 부족, 자율성 욕구, 사회적 인정 욕구, 선택 피로, 보상 심리
- 니즈 문장에서 그대로 뽑은 단어 조각을 이름으로 쓰지 않습니다. "위해서·하기 위해·싶다·하고·때문에"처럼
  Need Statement 문형을 이루는 연결어·어미는 이름에 절대 포함하지 않습니다.
  나쁜 예: "위해서 싶다", "나중 큰일", "것이 생각" — 문장 조각·조사·어미 나열
- 이름은 그 그룹을 처음 보는 사람이 무엇에 대한 니즈 묶음인지 즉시 이해할 수 있어야 합니다.`.trim();

/** 번호 기반 분류 프롬프트 — 긴 id echo를 없애 JSON 실패율을 낮춘다 */
function buildClusterPrompt(needs: NeedPayload[], retry: boolean): string {
  const blocks = needs
    .map((n, i) => `[${i + 1}] ${n.text}`)
    .join("\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래는 잠재 니즈 목록입니다(총 ${needs.length}개, 번호 [1]~[${needs.length}]).
**비슷한 내용끼리 모아 그룹으로 재분류**하고, 각 그룹에 **짧은 한국어 이름**을 붙이세요.

${KOREAN_PRIMARY_OUTPUT_RULE}

규칙:
- 모든 번호(1~${needs.length})를 정확히 한 그룹에만 넣습니다. 빠뜨리거나 중복하지 않습니다.
${GROUP_NAME_RULE}
- 그룹 수는 니즈 개수에 맞게 적당히(보통 2~6개). 1개만이면 1그룹도 가능.
- 결론·솔루션처럼 단정하지 말고, 니즈 묶음의 공통 주제를 이름으로 씁니다.
- JSON만 출력. 마크다운·설명 없음.
${
  retry
    ? "\n[재시도] 이전 응답이 형식에 맞지 않았습니다. 반드시 아래 JSON 형식 그대로, 번호는 숫자 배열로 출력하세요.\n"
    : ""
}
출력 형식:
{"groups":[{"name":"그룹이름","needIndexes":[1,2,5]}]}

잠재 니즈:
${blocks}`;
}

/** 묶음이 이미 있을 때 이름만 붙이는 소형 프롬프트 */
function buildNamingPrompt(clusters: string[][]): string {
  const blocks = clusters
    .map(
      (texts, i) =>
        `그룹 ${i + 1}:\n${texts.map((t) => `- ${t}`).join("\n")}`,
    )
    .join("\n\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래 잠재 니즈 그룹(${clusters.length}개)마다 **그룹 이름 1개씩**만 지으세요. 묶음은 바꾸지 않습니다.

${KOREAN_PRIMARY_OUTPUT_RULE}

규칙:
${GROUP_NAME_RULE}
- JSON만 출력. 마크다운·설명 없음.

출력 형식:
{"names":["그룹1 이름","그룹2 이름"]}

${blocks}`;
}

function extractJson(text: string): unknown | null {
  const match = text.trim().match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** AI 이름이 저품질·비허용 언어면 버리고 재도출한다 */
function acceptableName(raw: string): string | null {
  const sanitized = sanitizeCoachKoreanText(raw.trim()).slice(0, 40).trim();
  if (!sanitized) return null;
  if (isLowQualityGroupName(sanitized)) return null;
  if (hasDisallowedForeignScript(sanitized)) return null;
  if (!/[\uac00-\ud7a3]/.test(sanitized)) return null;
  return sanitized;
}

function parseClusterJson(
  text: string,
  needs: NeedPayload[],
): GroupResult[] | null {
  const parsed = extractJson(text) as {
    groups?: Array<{ name?: unknown; needIndexes?: unknown }>;
  } | null;
  if (!parsed || !Array.isArray(parsed.groups)) return null;

  const groups = parsed.groups
    .map((g) => {
      const indexes = Array.isArray(g.needIndexes)
        ? g.needIndexes
            .map((v) => Number.parseInt(String(v), 10))
            .filter((v) => Number.isFinite(v) && v >= 1 && v <= needs.length)
        : [];
      return {
        name: String(g.name ?? "").trim(),
        needIds: indexes.map((v) => needs[v - 1]!.id),
      };
    })
    .filter((g) => g.name && g.needIds.length > 0);
  return groups.length > 0 ? groups : null;
}

function parseNamesJson(text: string, count: number): string[] | null {
  const parsed = extractJson(text) as { names?: unknown } | null;
  if (!parsed || !Array.isArray(parsed.names)) return null;
  const names = parsed.names.map((n) => String(n ?? "").trim());
  return names.length >= count ? names.slice(0, count) : null;
}

async function aiCluster(
  needs: NeedPayload[],
): Promise<GroupResult[] | null> {
  for (const retry of [false, true]) {
    try {
      const result = await groqComplete(buildClusterPrompt(needs, retry), {
        models: resolveGroqTextModels(),
        temperature: retry ? 0.5 : 0.35,
        jsonMode: true,
      });
      const parsed = parseClusterJson(result.text, needs);
      if (parsed) return parsed;
    } catch {
      // 다음 시도로
    }
  }
  return null;
}

async function aiNameClusters(clusters: string[][]): Promise<string[] | null> {
  try {
    const result = await groqComplete(buildNamingPrompt(clusters), {
      models: resolveGroqTextModels(),
      temperature: 0.35,
      jsonMode: true,
    });
    return parseNamesJson(result.text, clusters.length);
  } catch {
    return null;
  }
}

function normalizeGroups(
  groups: GroupResult[],
  needs: NeedPayload[],
): GroupResult[] {
  const validIds = new Set(needs.map((n) => n.id));
  const textById = new Map(needs.map((n) => [n.id, n.text] as const));
  const used = new Set<string>();
  const cleaned: GroupResult[] = [];

  for (const group of groups) {
    const needIds = group.needIds.filter((id) => {
      if (!validIds.has(id) || used.has(id)) return false;
      used.add(id);
      return true;
    });
    if (needIds.length === 0) continue;
    const memberTexts = needIds.map((id) => textById.get(id) ?? "");
    const name =
      acceptableName(group.name) ?? deriveGroupNameFromTexts(memberTexts);
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

  const heuristicGroups = () => heuristicClusterNeeds(needs);

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      groups: normalizeGroups(heuristicGroups(), needs),
      source: "heuristic",
    });
  }

  // 1차: AI가 묶음+이름을 한 번에 (번호 기반, 1회 재시도 포함)
  const clustered = await aiCluster(needs);
  if (clustered) {
    return NextResponse.json({
      groups: normalizeGroups(clustered, needs),
      source: "groq",
    });
  }

  // 2차: 묶음은 휴리스틱, 이름은 AI가 붙임
  const fallback = heuristicGroups();
  const textById = new Map(needs.map((n) => [n.id, n.text] as const));
  const clusterTexts = fallback.map((g) =>
    g.needIds.map((id) => textById.get(id) ?? "").filter(Boolean),
  );
  const names = await aiNameClusters(clusterTexts);
  if (names) {
    const named = fallback.map((g, i) => ({
      name: names[i] ?? g.name,
      needIds: g.needIds,
    }));
    return NextResponse.json({
      groups: normalizeGroups(named, needs),
      source: "groq-named",
    });
  }

  // 3차: 완전 오프라인 — 빈도 기반 이름
  return NextResponse.json({
    groups: normalizeGroups(fallback, needs),
    source: "heuristic",
  });
}
