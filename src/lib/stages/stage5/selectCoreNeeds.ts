/**
 * 핵심 니즈 자동 선별 — 문제 밀접·Pain 연결·반복·깊이·HMW 전환 용이성.
 * Stanford d.school(POV·Extreme User)·Nielsen Norman Group(심각도×빈도) 가이드를 반영.
 * 대부분의 잠재 니즈는 사분면에 배치하고, 핵심만 ★로 지정한다.
 */

import {
  CORE_NEED_AUTO_TARGET,
  CORE_NEED_LIMIT,
  type NeedQuadrantCell,
  type NeedSignalId,
  type Stage5BoardPostit,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { listLatentNeedPostits } from "@/lib/stages/stage5/latentNeedsGroups";
import {
  resolveStepAiEntries,
  resolveStepZoneItems,
} from "@/lib/stages/stage6/journeyStepZones";
import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";

export type CoreNeedSelectionItem = {
  needId: string;
  cell: NeedQuadrantCell;
  signals: NeedSignalId[];
  rationale: string;
};

/** 사분면 배치(핵심 포함). parked는 소수만. */
export type CoreNeedPlacement = {
  needId: string;
  cell: NeedQuadrantCell;
  signals: NeedSignalId[];
};

export type CoreNeedSelectionResult = {
  /** 핵심으로 ★ 지정 (자동 기본 CORE_NEED_AUTO_TARGET개, 최대 CORE_NEED_LIMIT) */
  selections: CoreNeedSelectionItem[];
  /** 사분면에 올릴 전체 (핵심 포함). 대부분의 잠재 니즈 */
  placements: CoreNeedPlacement[];
  /** 보류함 — 주제와 거의 무관하거나 노이즈인 소수만 */
  parkedNeedIds: string[];
};

const PAIN_DEPTH_RE =
  /스트레스|막막|불안|답답|힘들|고통|포기|좌절|두려|걱정|초조|부담|피곤|지치|불편|막히|답 없|혼란|당황|창피|수치|외로|고립/;

const HMW_FRIENDLY_RE =
  /하고\s*싶|되고\s*싶|갖고\s*싶|알고\s*싶|느끼고\s*싶|위해|위한|필요|원하|바라/;

const WORKAROUND_RE = /이미|대신|우회|임시|그럭저럭|참고로|대안|해결하|버티|참으/;

function tokenize(text: string): Set<string> {
  const raw = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  return new Set(raw);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function overlapScore(a: string, b: string): number {
  return jaccard(tokenize(a), tokenize(b));
}

/** 여정 지도에서 Pain point 문구 수집 (배치 카드 + AI 문구) */
export function collectJourneyPainPoints(journey?: UserJourneyMapData): string[] {
  if (!journey) return [];
  const itemsById = journey.itemsById ?? {};
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  for (const persona of Object.values(journey.personas ?? {})) {
    for (const step of persona.steps ?? []) {
      const zoneItems = resolveStepZoneItems(step, itemsById);
      for (const id of zoneItems.pain_point) {
        const item = itemsById[id];
        if (item?.text) push(item.text);
      }
      for (const line of resolveStepAiEntries(step, "pain_point")) {
        push(line);
      }
    }
  }
  return out.slice(0, 40);
}

function sourceTextById(data: Stage5LatentNeedsData): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of data.postits) {
    if (p.kind === "latent_need") continue;
    if (p.text.trim()) map.set(p.id, p.text.trim());
  }
  return map;
}

function groupSizeByNeedId(data: Stage5LatentNeedsData): Map<string, number> {
  const map = new Map<string, number>();
  for (const ids of Object.values(data.needGroupMemberIds ?? {})) {
    const size = ids.length;
    for (const id of ids) map.set(id, size);
  }
  return map;
}

type ScoredNeed = {
  postit: Stage5BoardPostit;
  /** 핵심 후보 종합 점수 */
  score: number;
  importance: number;
  gap: number;
  signals: NeedSignalId[];
  rationale: string;
};

function cellFromAxes(importance: number, gap: number): NeedQuadrantCell {
  const highImp = importance >= 0.42;
  const highGap = gap >= 0.45;
  if (highImp && highGap) return "high_importance_high_gap";
  if (highImp && !highGap) return "high_importance_low_gap";
  if (!highImp && highGap) return "low_importance_high_gap";
  return "low_importance_low_gap";
}

/**
 * 휴리스틱 핵심 니즈 선별 (AI 없을 때·폴백).
 * 대부분 사분면 배치 + 핵심 기본 CORE_NEED_AUTO_TARGET개. 보류는 소수.
 */
export function heuristicSelectCoreNeeds(
  data: Stage5LatentNeedsData,
  problem: string,
  painPoints: string[],
): CoreNeedSelectionResult {
  const latents = listLatentNeedPostits(data);
  if (latents.length === 0) {
    return { selections: [], placements: [], parkedNeedIds: [] };
  }

  const problemTokens = tokenize(problem);
  const painBlob = painPoints.join(" ");
  const sources = sourceTextById(data);
  const groupSizes = groupSizeByNeedId(data);
  const subjectCount = Math.max(1, data.subjects.length);

  const normKey = (t: string) =>
    t.replace(/\s+/g, "").slice(0, 40).toLowerCase();
  const keySubjects = new Map<string, Set<string>>();
  for (const p of latents) {
    const key = normKey(p.text);
    if (!keySubjects.has(key)) keySubjects.set(key, new Set());
    keySubjects.get(key)!.add(p.subjectId);
  }

  const scored: ScoredNeed[] = latents.map((postit) => {
    const text = postit.text.trim();
    const signals: NeedSignalId[] = [];
    const reasons: string[] = [];

    const topic = jaccard(problemTokens, tokenize(text));
    let painLink = painBlob ? overlapScore(text, painBlob) : 0;
    for (const sid of postit.linkedSourceIds ?? []) {
      const src = sources.get(sid);
      if (!src) continue;
      painLink = Math.max(painLink, overlapScore(text, src));
      if (painBlob) painLink = Math.max(painLink, overlapScore(src, painBlob));
    }

    const subjectsForKey = keySubjects.get(normKey(text))?.size ?? 1;
    const breadth = Math.min(1, subjectsForKey / subjectCount);
    const groupSize = groupSizes.get(postit.id) ?? 1;
    const clusterBreadth = Math.min(1, (groupSize - 1) / 4);

    let depth = 0;
    if (PAIN_DEPTH_RE.test(text)) depth = 1;
    else {
      for (const sid of postit.linkedSourceIds ?? []) {
        const src = sources.get(sid);
        if (src && PAIN_DEPTH_RE.test(src)) {
          depth = 0.7;
          break;
        }
      }
    }

    const hmw = HMW_FRIENDLY_RE.test(text) ? 1 : 0;
    const hasWorkaround = WORKAROUND_RE.test(text);
    // gap: 자구책 없으면 높음, 있으면 낮음. Pain 연결 시 공백 가중
    let gap = hasWorkaround ? 0.25 : 0.55;
    if (painLink >= 0.1) gap += 0.2;
    if (depth >= 0.7) gap += 0.15;
    if (hasWorkaround) gap -= 0.15;
    gap = Math.max(0, Math.min(1, gap));

    // importance: 주제·Pain·반복·깊이
    let importance =
      topic * 0.35 +
      painLink * 0.3 +
      (breadth * 0.5 + clusterBreadth * 0.5) * 0.2 +
      depth * 0.15;
    // 문제 토큰이 비어 있으면 반복·Pain만으로도 중간 이상
    if (problemTokens.size === 0) {
      importance = Math.max(
        importance,
        painLink * 0.45 + breadth * 0.3 + depth * 0.25 + 0.2,
      );
    }
    importance = Math.max(0, Math.min(1, importance));

    if (topic >= 0.12) reasons.push("문제 주제와 맞닿음");
    if (painLink >= 0.1) {
      signals.push("pain");
      reasons.push("Pain point와 연결");
    }
    if (subjectsForKey >= 2 || groupSize >= 3) {
      signals.push("breadth");
      signals.push("frequency");
      reasons.push("여러 사용자·그룹에서 반복");
    }
    if (depth >= 0.7) {
      if (!signals.includes("pain")) signals.push("pain");
      reasons.push("고통의 깊이가 큼");
    }
    if (hmw) reasons.push("HMW로 바꾸기 쉬움");
    if (hasWorkaround) signals.push("workaround");
    else signals.push("gap");

    const score =
      importance * 4.2 +
      gap * 1.6 +
      hmw * 1.2 +
      (signals.includes("breadth") ? 0.8 : 0);

    const uniqueSignals = [...new Set(signals)];
    const rationale =
      reasons.slice(0, 3).join(" · ") ||
      "문제·Pain·반복 패턴을 종합해 핵심 후보로 골랐어요";

    return {
      postit,
      score,
      importance,
      gap,
      signals: uniqueSignals,
      rationale,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // 보류: 점수가 매우 낮고 주제·Pain과 거의 무관한 소수만 (최대 ~15%)
  const parkBudget = Math.min(
    Math.floor(scored.length * 0.15),
    Math.max(0, scored.length - 4),
  );
  const parkedSet = new Set(
    [...scored]
      .filter((s) => s.score < 1.4 && s.importance < 0.28)
      .sort((a, b) => a.score - b.score)
      .slice(0, parkBudget)
      .map((s) => s.postit.id),
  );

  const placed = scored.filter((s) => !parkedSet.has(s.postit.id));

  // 핵심: 사분면 배치분 중 상위부터 기본 목표 개수까지 채움
  const corePool = [...placed].sort((a, b) => {
    const aCore =
      (a.importance >= 0.42 && a.gap >= 0.45 ? 2 : 0) + a.score;
    const bCore =
      (b.importance >= 0.42 && b.gap >= 0.45 ? 2 : 0) + b.score;
    return bCore - aCore;
  });
  const pickCount = Math.min(CORE_NEED_AUTO_TARGET, corePool.length);
  const picked = corePool.slice(0, pickCount);
  const pickedIds = new Set(picked.map((s) => s.postit.id));

  const selections: CoreNeedSelectionItem[] = picked.map((s) => ({
    needId: s.postit.id,
    cell: "high_importance_high_gap",
    signals: s.signals.length
      ? s.signals
      : (["pain", "gap"] as NeedSignalId[]),
    rationale: s.rationale.slice(0, 200),
  }));

  const placements: CoreNeedPlacement[] = placed.map((s) => {
    // 핵심은 후보 셀에 고정
    if (pickedIds.has(s.postit.id)) {
      return {
        needId: s.postit.id,
        cell: "high_importance_high_gap",
        signals: s.signals.length
          ? s.signals
          : (["pain", "gap"] as NeedSignalId[]),
      };
    }
    return {
      needId: s.postit.id,
      cell: cellFromAxes(s.importance, s.gap),
      signals: s.signals,
    };
  });

  return {
    selections,
    placements,
    parkedNeedIds: [...parkedSet],
  };
}

/**
 * AI가 목표보다 적게 고른 경우, 휴리스틱 순위로 핵심을 채워
 * 기본 CORE_NEED_AUTO_TARGET개까지 맞춘다 (가용 니즈가 부족하면 그만큼만).
 */
export function padCoreSelectionsToAutoTarget(
  primary: CoreNeedSelectionResult,
  fallback: CoreNeedSelectionResult,
): CoreNeedSelectionResult {
  const availableCount = new Set([
    ...primary.placements.map((p) => p.needId),
    ...fallback.placements.map((p) => p.needId),
    ...primary.selections.map((s) => s.needId),
    ...fallback.selections.map((s) => s.needId),
  ]).size;
  const target = Math.min(CORE_NEED_AUTO_TARGET, availableCount);

  if (primary.selections.length >= target) {
    return {
      ...primary,
      selections: primary.selections.slice(0, CORE_NEED_LIMIT),
    };
  }

  const used = new Set(primary.selections.map((s) => s.needId));
  const selections = [...primary.selections];
  for (const s of fallback.selections) {
    if (selections.length >= target) break;
    if (used.has(s.needId)) continue;
    used.add(s.needId);
    selections.push(s);
  }
  // 휴리스틱 selections에 없어도 placements 상위 후보로 보충
  const parkedFallback = new Set(fallback.parkedNeedIds);
  for (const p of fallback.placements) {
    if (selections.length >= target) break;
    if (used.has(p.needId) || parkedFallback.has(p.needId)) continue;
    used.add(p.needId);
    selections.push({
      needId: p.needId,
      cell: "high_importance_high_gap",
      signals: p.signals.length
        ? p.signals
        : (["pain", "gap"] as NeedSignalId[]),
      rationale: "문제·Pain·반복 패턴을 종합해 핵심 후보로 골랐어요",
    });
  }

  const coreSet = new Set(selections.map((s) => s.needId));
  const placementById = new Map<string, CoreNeedPlacement>();
  for (const p of primary.placements) placementById.set(p.needId, p);
  for (const p of fallback.placements) {
    if (!placementById.has(p.needId)) placementById.set(p.needId, p);
  }
  for (const s of selections) {
    placementById.set(s.needId, {
      needId: s.needId,
      cell: "high_importance_high_gap",
      signals: s.signals,
    });
  }

  const parkedNeedIds = (
    primary.parkedNeedIds.length > 0
      ? primary.parkedNeedIds
      : fallback.parkedNeedIds
  ).filter((id) => !coreSet.has(id));

  return {
    selections: selections.slice(0, CORE_NEED_LIMIT),
    placements: [...placementById.values()].map((p) =>
      coreSet.has(p.needId)
        ? { ...p, cell: "high_importance_high_gap" as const }
        : p,
    ),
    parkedNeedIds,
  };
}

/** 선별 결과를 보드 상태에 반영 (사분면·핵심·보류·근거) */
export function applyCoreNeedSelection(
  data: Stage5LatentNeedsData,
  result: CoreNeedSelectionResult,
): Stage5LatentNeedsData {
  const latentIds = new Set(listLatentNeedPostits(data).map((p) => p.id));
  const selections = result.selections.filter((s) => latentIds.has(s.needId));
  const coreNeedIds = selections.map((s) => s.needId).slice(0, CORE_NEED_LIMIT);
  const coreSet = new Set(coreNeedIds);

  const placementById = new Map<string, CoreNeedPlacement>();
  for (const p of result.placements ?? []) {
    if (!latentIds.has(p.needId)) continue;
    placementById.set(p.needId, p);
  }
  // 핵심이 placements에 없으면 보충
  for (const s of selections) {
    if (!placementById.has(s.needId)) {
      placementById.set(s.needId, {
        needId: s.needId,
        cell: s.cell,
        signals: s.signals,
      });
    }
  }

  // placements가 비어 있으면(구버전 응답) 핵심만 배치하고 나머지는 보류하지 않도록 휴리스틱 재배치 유도 —
  // 여기서는 핵심만 반영하고, 남은 니즈는 미배치로 두지 않고 low 셀에 분산
  if (placementById.size === 0 && coreNeedIds.length > 0) {
    for (const s of selections) {
      placementById.set(s.needId, {
        needId: s.needId,
        cell: s.cell,
        signals: s.signals,
      });
    }
  }

  const parkedFromResult = (result.parkedNeedIds ?? []).filter(
    (id) => latentIds.has(id) && !coreSet.has(id),
  );
  const parkedSet = new Set(parkedFromResult);

  // 사분면에도 보류에도 없는 잠재 니즈 → 대부분 사분면에 넣기
  for (const id of latentIds) {
    if (placementById.has(id) || parkedSet.has(id)) continue;
    // 누락분: 낮은 사분면에 배치 (보류 최소화)
    placementById.set(id, {
      needId: id,
      cell: "low_importance_low_gap",
      signals: [],
    });
  }

  const needRatings: Stage5LatentNeedsData["needRatings"] = {};
  for (const p of placementById.values()) {
    if (parkedSet.has(p.needId)) continue;
    needRatings[p.needId] = {
      cell: coreSet.has(p.needId) ? "high_importance_high_gap" : p.cell,
      signals: [...new Set(p.signals)].slice(0, 5),
    };
  }

  const selectionRationales: Record<string, string> = {};
  for (const s of selections) {
    if (s.rationale.trim()) {
      selectionRationales[s.needId] = s.rationale.trim().slice(0, 200);
    }
  }

  return {
    ...data,
    workflowPhase: "core_selection",
    needRatings,
    coreNeedIds,
    parkedNeedIds: [...parkedSet],
    selectionRationales,
  };
}
