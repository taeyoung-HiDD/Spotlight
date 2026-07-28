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

/** 한 그룹이 넘으면 안 되는 최대 크기 — 이 이상이면 소주제로 쪼갠다 */
function oversizedLimit(total: number): number {
  return Math.max(8, Math.ceil(total * 0.34));
}

function minGroupCount(total: number): number {
  if (total >= 30) return 5;
  if (total >= 12) return 4;
  if (total >= 6) return 3;
  return 2;
}

/** 번호 기반 분류 프롬프트 — 긴 id echo를 없애 JSON 실패율을 낮춘다 */
function buildClusterPrompt(
  needs: NeedPayload[],
  retry: boolean,
  split: boolean,
): string {
  const blocks = needs
    .map((n, i) => `[${i + 1}] ${n.text}`)
    .join("\n");
  const minGroups = minGroupCount(needs.length);
  const maxPerGroup = oversizedLimit(needs.length);

  const balanceRule = split
    ? `- 이 니즈들은 이미 한 그룹에 과도하게 뭉쳐 있던 것입니다. **반드시 서로 다른 소주제 ${minGroups}개 이상**으로 나누세요.
  큰 주제(예: "자산 관리")를 그대로 두지 말고 그 안의 소주제(예: "지출 통제", "투자 판단 불안", "재정 목표 설정", "독립적 재정 계획")로 쪼갭니다.`
    : `- 그룹은 최소 ${minGroups}개 이상 만듭니다. 한 그룹에 니즈를 ${maxPerGroup}개보다 많이 넣지 않습니다.
  대부분의 니즈가 한 그룹에 몰리면 분류의 의미가 없습니다. 주제가 넓으면 소주제로 쪼개세요
  (예: "자산 관리" 하나로 몰지 말고 "지출 통제", "투자 판단 불안", "재정 목표 설정" 등으로 구분).
- 억지로 같은 크기로 맞출 필요는 없지만, 서로 다른 심리·상황·가치는 다른 그룹이어야 합니다.`;

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래는 잠재 니즈 목록입니다(총 ${needs.length}개, 번호 [1]~[${needs.length}]).
**비슷한 내용끼리 모아 그룹으로 재분류**하고, 각 그룹에 **짧은 한국어 이름**을 붙이세요.

${KOREAN_PRIMARY_OUTPUT_RULE}

규칙:
- 모든 번호(1~${needs.length})를 정확히 한 그룹에만 넣습니다. 빠뜨리거나 중복하지 않습니다.
  일부만 분류하고 나머지를 남기는 것은 실패입니다. 마지막 번호까지 반드시 배정하세요.
${balanceRule}
${GROUP_NAME_RULE}
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

function uniqueAssignedCount(groups: GroupResult[]): number {
  return new Set(groups.flatMap((g) => g.needIds)).size;
}

/**
 * 번호 기반 AI 분류. 배정 커버리지가 95% 미만이면 재시도하고,
 * 두 시도 중 커버리지가 높은 결과를 채택한다.
 */
async function aiCluster(
  needs: NeedPayload[],
  split = false,
): Promise<GroupResult[] | null> {
  let best: GroupResult[] | null = null;
  let bestCount = 0;
  for (const retry of [false, true]) {
    try {
      const result = await groqComplete(
        buildClusterPrompt(needs, retry, split),
        {
          models: resolveGroqTextModels(),
          temperature: retry ? 0.5 : 0.35,
          jsonMode: true,
        },
      );
      const parsed = parseClusterJson(result.text, needs);
      if (parsed) {
        const count = uniqueAssignedCount(parsed);
        if (count > bestCount) {
          best = parsed;
          bestCount = count;
        }
        if (count >= Math.ceil(needs.length * 0.95)) return best;
      }
    } catch {
      // 다음 시도로
    }
  }
  return best;
}

function unassignedNeeds(
  groups: GroupResult[],
  needs: NeedPayload[],
): NeedPayload[] {
  const assigned = new Set(groups.flatMap((g) => g.needIds));
  return needs.filter((n) => !assigned.has(n.id));
}

function mergeGroupsByName(
  base: GroupResult[],
  extra: GroupResult[],
): GroupResult[] {
  const out = base.map((g) => ({ ...g, needIds: [...g.needIds] }));
  for (const group of extra) {
    const key = group.name.trim();
    const existing = out.find((g) => g.name.trim() === key);
    if (existing) {
      existing.needIds.push(...group.needIds);
    } else {
      out.push({ name: group.name, needIds: [...group.needIds] });
    }
  }
  return out;
}

/**
 * AI가 일부만 분류하고 남긴 니즈를 추가 패스로 마저 분류한다.
 * AI 패스로도 남으면 휴리스틱 묶음 + AI 이름으로 마무리해
 * "미분류"에는 소수만 남게 한다.
 */
async function clusterRemainder(
  groups: GroupResult[],
  needs: NeedPayload[],
): Promise<GroupResult[]> {
  let out = groups;
  for (let pass = 0; pass < 2; pass += 1) {
    const remaining = unassignedNeeds(out, needs);
    if (remaining.length < 4) return out;
    const sub = await aiCluster(remaining);
    if (!sub) break;
    out = mergeGroupsByName(out, sub);
  }

  const remaining = unassignedNeeds(out, needs);
  if (remaining.length >= 6) {
    const clusters = heuristicClusterNeeds(remaining);
    const textById = new Map(remaining.map((n) => [n.id, n.text] as const));
    const names = await aiNameClusters(
      clusters.map((g) =>
        g.needIds.map((id) => textById.get(id) ?? "").filter(Boolean),
      ),
    );
    const named = names
      ? clusters.map((g, i) => ({ name: names[i] ?? g.name, needIds: g.needIds }))
      : clusters;
    out = mergeGroupsByName(out, named);
  }
  return out;
}

/**
 * 한 그룹에 니즈가 과도하게 몰린 경우(전체의 1/3 초과) 그 그룹만 다시
 * 소주제로 분할한다. AI 분할이 실패하면 휴리스틱 묶음으로 대체한다.
 */
async function splitOversizedGroups(
  groups: GroupResult[],
  needs: NeedPayload[],
  useAi: boolean,
): Promise<GroupResult[]> {
  const limit = oversizedLimit(needs.length);
  const textById = new Map(needs.map((n) => [n.id, n.text] as const));
  const out: GroupResult[] = [];

  for (const group of groups) {
    if (group.needIds.length <= limit) {
      out.push(group);
      continue;
    }
    const subNeeds = group.needIds
      .map((id) => ({ id, text: textById.get(id) ?? "" }))
      .filter((n) => n.text);
    if (subNeeds.length < 6) {
      out.push(group);
      continue;
    }

    let sub: GroupResult[] | null = null;
    if (useAi) sub = await aiCluster(subNeeds, true);
    if (!sub || sub.length <= 1) sub = heuristicClusterNeeds(subNeeds);

    // 분할이 실제로 쪼개졌을 때만 채택 (여전히 한 덩어리면 원본 유지)
    const largest = Math.max(...sub.map((g) => g.needIds.length));
    if (sub.length > 1 && largest < group.needIds.length) {
      out.push(...sub);
    } else {
      out.push(group);
    }
  }

  return out;
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

  // 1차: AI가 묶음+이름을 한 번에 (번호 기반, 커버리지 미달 시 재시도)
  const clustered = await aiCluster(needs);
  if (clustered) {
    const completed = await clusterRemainder(clustered, needs);
    const balanced = await splitOversizedGroups(completed, needs, true);
    return NextResponse.json({
      groups: normalizeGroups(balanced, needs),
      source: "groq",
    });
  }

  // 2차: 묶음은 휴리스틱, 이름은 AI가 붙임
  const fallback = await splitOversizedGroups(heuristicGroups(), needs, true);
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
