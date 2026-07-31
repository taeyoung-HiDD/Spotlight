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
  collapseSingletonClusters,
  deriveGroupNameFromTexts,
  heuristicClusterNeeds,
  isLowQualityGroupName,
  textSimilarity,
  UNCLASSIFIED_RECLUSTER_MIN,
} from "@/lib/stages/stage5/categorizeNeedsHeuristic";

interface NeedPayload {
  id: string;
  text: string;
}

type GroupResult = { name: string; needIds: string[] };

const AI_CHUNK_SIZE = 28;

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
  묶인 니즈들에 공통된 근본 주제·심리를 **짧은 한국어 명사(구) 1~4어절**로 표현합니다.
  좋은 예: 시간 압박, 정보 신뢰 부족, 자율성 욕구, 사회적 인정 욕구, 선택 피로, 보상 심리, 경제적 독립, 투자 판단, 지출 부담, 재정 불안
- 니즈 문장에서 앞부분·중간 단어를 그대로 잘라 이름으로 쓰지 않습니다.
  나쁜 예: "많이 것에", "recent years", "허탈감 돈이", "정체성 요구받", "파악하고자 월말",
  "돌아서면 마음대", "000 3년", "Career change salary", "Monthly credit card bill"
  — 조사·어미로 끝난 조각, 영어 단어, 문장 앞머리 복사
- 이름은 그 그룹을 처음 보는 사람이 무엇에 대한 니즈 묶음인지 즉시 이해할 수 있어야 합니다.
- 반드시 한글 주제 라벨만 씁니다. 영어 라벨·영한 혼용 금지.`.trim();

function oversizedLimit(total: number): number {
  return Math.max(8, Math.ceil(total * 0.34));
}

function minGroupCount(total: number): number {
  if (total >= 30) return 5;
  if (total >= 12) return 4;
  if (total >= 6) return 3;
  return 2;
}

function buildClusterPrompt(
  needs: NeedPayload[],
  retry: boolean,
  split: boolean,
): string {
  const blocks = needs.map((n, i) => `[${i + 1}] ${n.text}`).join("\n");
  const minGroups = minGroupCount(needs.length);
  const maxPerGroup = oversizedLimit(needs.length);

  const balanceRule = split
    ? `- 이 니즈들은 이미 한 그룹에 과도하게 뭉쳐 있던 것입니다. **반드시 서로 다른 소주제 ${minGroups}개 이상**으로 나누세요.
  큰 주제를 그대로 두지 말고 소주제(예: "지출 통제", "투자 판단 불안", "재정 목표 설정")로 쪼갭니다.
  1개짜리 그룹을 많이 만들지 마세요. 비슷한 니즈는 반드시 같은 그룹에 넣습니다.`
    : `- 그룹은 최소 ${minGroups}개 이상 만듭니다. 한 그룹에 니즈를 ${maxPerGroup}개보다 많이 넣지 않습니다.
  주제가 넓으면 소주제로 쪼개되, 1~2개짜리 파편 그룹을 잔뜩 만들지 마세요.
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
    ? "\n[재시도] 이전 응답이 형식에 맞지 않았습니다. 반드시 아래 JSON 형식 그대로, 번호는 숫자 배열로 출력하세요. 모든 번호를 빠짐없이 배정하세요.\n"
    : ""
}
출력 형식:
{"groups":[{"name":"그룹이름","needIndexes":[1,2,5]}]}

잠재 니즈:
${blocks}`;
}

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

function acceptableName(raw: string): string | null {
  const sanitized = sanitizeCoachKoreanText(raw.trim()).slice(0, 40).trim();
  if (!sanitized) return null;
  if (isLowQualityGroupName(sanitized)) return null;
  if (hasDisallowedForeignScript(sanitized)) return null;
  if (!/[\uac00-\ud7a3]/.test(sanitized)) return null;
  // 영어가 섞이거나 조사로 끝나면 거부
  if (/[a-zA-Z]{2,}/.test(sanitized)) return null;
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

async function aiClusterOnce(
  needs: NeedPayload[],
  split: boolean,
): Promise<GroupResult[] | null> {
  let best: GroupResult[] | null = null;
  let bestCount = 0;
  for (const retry of [false, true]) {
    try {
      const result = await groqComplete(
        buildClusterPrompt(needs, retry, split),
        {
          models: resolveGroqTextModels(),
          temperature: retry ? 0.45 : 0.3,
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
      // 다음 시도
    }
  }
  return best;
}

function chunkNeeds(needs: NeedPayload[], size: number): NeedPayload[][] {
  if (needs.length <= size) return [needs];
  const chunks: NeedPayload[][] = [];
  for (let i = 0; i < needs.length; i += size) {
    chunks.push(needs.slice(i, i + size));
  }
  return chunks;
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
 * 니즈가 많으면 청크로 나눠 분류한 뒤 합친다.
 * 한 번에 80개+를내면 AI가 앞부분만 배정하고 나머지를 미분류로 남기는 문제를 막는다.
 */
async function aiCluster(
  needs: NeedPayload[],
  split = false,
): Promise<GroupResult[] | null> {
  if (needs.length <= AI_CHUNK_SIZE) {
    return aiClusterOnce(needs, split);
  }

  const chunks = chunkNeeds(needs, AI_CHUNK_SIZE);
  let merged: GroupResult[] = [];
  let any = false;
  for (const chunk of chunks) {
    const result = await aiClusterOnce(chunk, split);
    if (result) {
      any = true;
      merged = mergeGroupsByName(merged, result);
    }
  }
  return any ? merged : null;
}

function unassignedNeeds(
  groups: GroupResult[],
  needs: NeedPayload[],
): NeedPayload[] {
  const assigned = new Set(groups.flatMap((g) => g.needIds));
  return needs.filter((n) => !assigned.has(n.id));
}

/** 남은 니즈를 기존 그룹 중 가장 비슷한 곳에 흡수 */
function absorbIntoNearestGroups(
  groups: GroupResult[],
  leftovers: NeedPayload[],
  textById: Map<string, string>,
  minSimilarity = 0.1,
): { groups: GroupResult[]; leftover: NeedPayload[] } {
  if (leftovers.length === 0 || groups.length === 0) {
    return { groups, leftover: leftovers };
  }

  const out = groups.map((g) => ({ ...g, needIds: [...g.needIds] }));
  const still: NeedPayload[] = [];

  for (const need of leftovers) {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < out.length; i += 1) {
      const group = out[i]!;
      if (group.name === "미분류") continue;
      let score = 0;
      for (const id of group.needIds) {
        const member = textById.get(id) ?? "";
        if (!member) continue;
        score = Math.max(score, textSimilarity(need.text, member));
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestScore >= minSimilarity) {
      out[bestIdx]!.needIds.push(need.id);
    } else {
      still.push(need);
    }
  }

  return { groups: out, leftover: still };
}

async function aiNameClusters(clusters: string[][]): Promise<string[] | null> {
  if (clusters.length === 0) return [];
  try {
    const result = await groqComplete(buildNamingPrompt(clusters), {
      models: resolveGroqTextModels(),
      temperature: 0.3,
      jsonMode: true,
    });
    return parseNamesJson(result.text, clusters.length);
  } catch {
    return null;
  }
}

/**
 * 잔여 니즈: AI 재분류 → 실패 시 휴리스틱(싱글톤 흡수 포함) → 그래도 남으면 기존 그룹에 흡수.
 */
async function clusterRemainder(
  groups: GroupResult[],
  needs: NeedPayload[],
): Promise<GroupResult[]> {
  const textById = new Map(needs.map((n) => [n.id, n.text] as const));
  let out = groups;

  for (let pass = 0; pass < 2; pass += 1) {
    const remaining = unassignedNeeds(out, needs);
    if (remaining.length === 0) return out;
    if (remaining.length < 3) {
      const absorbed = absorbIntoNearestGroups(out, remaining, textById, 0.08);
      return absorbed.groups;
    }
    const sub = await aiCluster(remaining);
    if (!sub) break;
    out = mergeGroupsByName(out, sub);
  }

  let remaining = unassignedNeeds(out, needs);
  if (remaining.length === 0) return out;

  if (remaining.length >= 3) {
    const clusters = heuristicClusterNeeds(remaining);
    const namedTexts = clusters.map((g) =>
      g.needIds.map((id) => textById.get(id) ?? "").filter(Boolean),
    );
    const names = await aiNameClusters(namedTexts);
    const named = clusters.map((g, i) => ({
      name: (names && acceptableName(names[i] ?? "")) ||
        acceptableName(g.name) ||
        deriveGroupNameFromTexts(namedTexts[i] ?? []) ||
        "관련 니즈",
      needIds: g.needIds,
    }));
    // 1개짜리·저품질 이름 그룹은 새 그룹으로 올리지 않고 흡수 후보로 남김
    const keep: GroupResult[] = [];
    const reabsorb: NeedPayload[] = [];
    for (const g of named) {
      if (g.needIds.length <= 1 || isLowQualityGroupName(g.name)) {
        for (const id of g.needIds) {
          const text = textById.get(id);
          if (text) reabsorb.push({ id, text });
        }
      } else {
        keep.push(g);
      }
    }
    out = mergeGroupsByName(out, keep);
    remaining = [...unassignedNeeds(out, needs), ...reabsorb];
  }

  const absorbed = absorbIntoNearestGroups(out, remaining, textById, 0.08);
  return absorbed.groups;
}

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

    if (!sub || sub.length <= 1) {
      // 휴리스틱 분할은 파편 이름을 만들기 쉬워, 싱글톤을 흡수한 뒤 AI 이름만 붙인다
      const heur = heuristicClusterNeeds(subNeeds);
      const collapsed = collapseSingletonClusters(
        heur,
        new Map(subNeeds.map((n) => [n.id, n.text] as const)),
      );
      if (collapsed.length > 1) {
        const names = await aiNameClusters(
          collapsed.map((g) =>
            g.needIds.map((id) => textById.get(id) ?? "").filter(Boolean),
          ),
        );
        sub = collapsed.map((g, i) => ({
          name:
            (names && acceptableName(names[i] ?? "")) ||
            acceptableName(g.name) ||
            deriveGroupNameFromTexts(
              g.needIds.map((id) => textById.get(id) ?? ""),
            ) ||
            `${group.name} · ${i + 1}`,
          needIds: g.needIds,
        }));
      }
    }

    if (!sub || sub.length <= 1) {
      out.push(group);
      continue;
    }

    const largest = Math.max(...sub.map((g) => g.needIds.length));
    if (largest < group.needIds.length) {
      out.push(...sub);
    } else {
      out.push(group);
    }
  }

  return out;
}

/** 저품질·파편 이름을 AI로 다시 붙이거나 휴리스틱으로 교체 */
async function polishGroupNames(
  groups: GroupResult[],
  needs: NeedPayload[],
): Promise<GroupResult[]> {
  const textById = new Map(needs.map((n) => [n.id, n.text] as const));
  const needsRename = groups
    .map((g, index) => ({ g, index }))
    .filter(
      ({ g }) =>
        g.name !== "미분류" &&
        (isLowQualityGroupName(g.name) || !acceptableName(g.name)),
    );

  if (needsRename.length === 0) return groups;

  const clusters = needsRename.map(({ g }) =>
    g.needIds.map((id) => textById.get(id) ?? "").filter(Boolean),
  );
  const names = await aiNameClusters(clusters);
  const out = groups.map((g) => ({ ...g, needIds: [...g.needIds] }));

  needsRename.forEach(({ index }, i) => {
    const texts = clusters[i] ?? [];
    const next =
      (names && acceptableName(names[i] ?? "")) ||
      deriveGroupNameFromTexts(texts) ||
      `그룹 ${index + 1}`;
    out[index]!.name = acceptableName(next) ?? `그룹 ${index + 1}`;
  });

  return out;
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
    let name =
      acceptableName(group.name) ?? deriveGroupNameFromTexts(memberTexts);
    if (!name || isLowQualityGroupName(name)) {
      name = deriveGroupNameFromTexts(memberTexts);
    }
    if (!name || isLowQualityGroupName(name)) {
      name = `그룹 ${cleaned.length + 1}`;
    }
    cleaned.push({ name, needIds });
  }

  // 1개짜리 파편 그룹 흡수
  const collapsed = collapseSingletonClusters(
    cleaned.filter((g) => g.name !== "미분류"),
    textById,
  );

  let missing = needs.filter((n) => !used.has(n.id));
  // collapse로 빠진 id는 없어야 하지만, 미배정은 기존 그룹에 흡수
  const assignedAfter = new Set(collapsed.flatMap((g) => g.needIds));
  missing = needs.filter((n) => !assignedAfter.has(n.id));

  if (missing.length > 0) {
    const absorbed = absorbIntoNearestGroups(
      collapsed,
      missing,
      textById,
      0.08,
    );
    if (absorbed.leftover.length > 0) {
      return [
        ...absorbed.groups,
        {
          name: "미분류",
          needIds: absorbed.leftover.map((n) => n.id),
        },
      ];
    }
    return absorbed.groups;
  }

  return collapsed;
}

function unclassifiedNeedCount(groups: GroupResult[]): number {
  return groups.find((g) => g.name === "미분류")?.needIds.length ?? 0;
}

/**
 * 미분류가 10개 이상이면 해당 풀만 다시 클러스터링해 유명 그룹으로 흡수·분리한다.
 * (한 번에 다 못 나눈 잔여가 미분류로 쌓이는 경우 대응)
 */
async function reclusterLargeUnclassified(
  groups: GroupResult[],
  needs: NeedPayload[],
): Promise<GroupResult[]> {
  let out = groups;
  for (let pass = 0; pass < 2; pass += 1) {
    const unc = out.find((g) => g.name === "미분류");
    if (!unc || unc.needIds.length < UNCLASSIFIED_RECLUSTER_MIN) {
      return out;
    }

    const named = out.filter((g) => g.name !== "미분류");
    const leftoverIds = new Set(unc.needIds);
    const leftovers = needs.filter((n) => leftoverIds.has(n.id));
    if (leftovers.length < UNCLASSIFIED_RECLUSTER_MIN) return out;

    let sub = await aiCluster(leftovers);
    if (!sub) {
      const textById = new Map(needs.map((n) => [n.id, n.text] as const));
      const heur = collapseSingletonClusters(
        heuristicClusterNeeds(leftovers),
        textById,
      );
      const names = await aiNameClusters(
        heur.map((g) =>
          g.needIds.map((id) => textById.get(id) ?? "").filter(Boolean),
        ),
      );
      sub = heur.map((g, i) => ({
        name:
          (names && acceptableName(names[i] ?? "")) ||
          acceptableName(g.name) ||
          deriveGroupNameFromTexts(
            g.needIds.map((id) => textById.get(id) ?? ""),
          ) ||
          "관련 니즈",
        needIds: g.needIds,
      }));
    }

    const merged = mergeGroupsByName(named, sub);
    const completed = await clusterRemainder(merged, needs);
    const polished = await polishGroupNames(completed, needs);
    const next = normalizeGroups(polished, needs);

    // 진전이 없으면 중단 (무한 루프 방지)
    if (unclassifiedNeedCount(next) >= unc.needIds.length) {
      return next;
    }
    out = next;
  }
  return out;
}

async function finalizeCategorizedGroups(
  groups: GroupResult[],
  needs: NeedPayload[],
): Promise<GroupResult[]> {
  const normalized = normalizeGroups(groups, needs);
  return reclusterLargeUnclassified(normalized, needs);
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

  const heuristicGroups = () => {
    const raw = heuristicClusterNeeds(needs);
    const byId = new Map(needs.map((n) => [n.id, n.text] as const));
    return collapseSingletonClusters(raw, byId);
  };

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      groups: await finalizeCategorizedGroups(heuristicGroups(), needs),
      source: "heuristic",
    });
  }

  const clustered = await aiCluster(needs);
  if (clustered) {
    const completed = await clusterRemainder(clustered, needs);
    const balanced = await splitOversizedGroups(completed, needs, true);
    const polished = await polishGroupNames(balanced, needs);
    return NextResponse.json({
      groups: await finalizeCategorizedGroups(polished, needs),
      source: "groq",
    });
  }

  const fallback = await splitOversizedGroups(heuristicGroups(), needs, true);
  const textById = new Map(needs.map((n) => [n.id, n.text] as const));
  const clusterTexts = fallback.map((g) =>
    g.needIds.map((id) => textById.get(id) ?? "").filter(Boolean),
  );
  const names = await aiNameClusters(clusterTexts);
  if (names) {
    const named = fallback.map((g, i) => ({
      name: acceptableName(names[i] ?? "") ?? g.name,
      needIds: g.needIds,
    }));
    const polished = await polishGroupNames(named, needs);
    return NextResponse.json({
      groups: await finalizeCategorizedGroups(polished, needs),
      source: "groq-named",
    });
  }

  return NextResponse.json({
    groups: await finalizeCategorizedGroups(fallback, needs),
    source: "heuristic",
  });
}
