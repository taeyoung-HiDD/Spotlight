import {
  CORE_NEED_LIMIT,
  type NeedQuadrantCell,
  type NeedSignalId,
  type Stage5BoardPostit,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { listLatentNeedPostits } from "@/lib/stages/stage5/latentNeedsGroups";

export const NEED_SIGNAL_LABELS: Record<NeedSignalId, string> = {
  workaround: "자구책 있음",
  frequency: "자주 겪음",
  pain: "고통 큼",
  breadth: "널리 겪음",
  gap: "해결 공백",
};

export const NEED_QUADRANT_LABELS: Record<NeedQuadrantCell, string> = {
  high_importance_high_gap: "중요하고 해결도 안 됨",
  high_importance_low_gap: "중요하지만 대안 있음",
  low_importance_high_gap: "덜 중요하지만 비어 있음",
  low_importance_low_gap: "덜 중요하고 대안 있음",
};

/** 핵심 후보로 가장 유력한 셀 */
export const CORE_CANDIDATE_CELL: NeedQuadrantCell =
  "high_importance_high_gap";

/** 사분면에 배치 (보류 상태였다면 자동 복귀) */
export function placeNeedInQuadrant(
  data: Stage5LatentNeedsData,
  needId: string,
  cell: NeedQuadrantCell,
): Stage5LatentNeedsData {
  const need = data.postits.find((p) => p.id === needId);
  if (!need || need.kind !== "latent_need") return data;
  const prev = data.needRatings[needId];
  return {
    ...data,
    needRatings: {
      ...data.needRatings,
      [needId]: { cell, signals: prev?.signals ?? [] },
    },
    parkedNeedIds: data.parkedNeedIds.filter((id) => id !== needId),
  };
}

/** 사분면에서 빼서 미배치 트레이로 되돌리기 */
export function clearNeedRating(
  data: Stage5LatentNeedsData,
  needId: string,
): Stage5LatentNeedsData {
  if (!data.needRatings[needId]) return data;
  const needRatings = { ...data.needRatings };
  delete needRatings[needId];
  return {
    ...data,
    needRatings,
    coreNeedIds: data.coreNeedIds.filter((id) => id !== needId),
  };
}

/** 근거 배지 토글 */
export function toggleNeedSignal(
  data: Stage5LatentNeedsData,
  needId: string,
  signal: NeedSignalId,
): Stage5LatentNeedsData {
  const rating = data.needRatings[needId];
  if (!rating) return data;
  const signals = rating.signals.includes(signal)
    ? rating.signals.filter((s) => s !== signal)
    : [...rating.signals, signal];
  return {
    ...data,
    needRatings: {
      ...data.needRatings,
      [needId]: { ...rating, signals },
    },
  };
}

/** 핵심 니즈 토글 — CORE_NEED_LIMIT개 제한 */
export function toggleCoreNeed(
  data: Stage5LatentNeedsData,
  needId: string,
): Stage5LatentNeedsData {
  if (data.coreNeedIds.includes(needId)) {
    return {
      ...data,
      coreNeedIds: data.coreNeedIds.filter((id) => id !== needId),
    };
  }
  if (data.coreNeedIds.length >= CORE_NEED_LIMIT) return data;
  const need = data.postits.find((p) => p.id === needId);
  if (!need || need.kind !== "latent_need") return data;
  return {
    ...data,
    coreNeedIds: [...data.coreNeedIds, needId],
    parkedNeedIds: data.parkedNeedIds.filter((id) => id !== needId),
  };
}

/** 보류함으로 보내기 (핵심 지정은 해제, 사분면 평가는 보존) */
export function parkNeed(
  data: Stage5LatentNeedsData,
  needId: string,
): Stage5LatentNeedsData {
  const need = data.postits.find((p) => p.id === needId);
  if (!need || need.kind !== "latent_need") return data;
  if (data.parkedNeedIds.includes(needId)) return data;
  return {
    ...data,
    parkedNeedIds: [...data.parkedNeedIds, needId],
    coreNeedIds: data.coreNeedIds.filter((id) => id !== needId),
  };
}

/** 보류함에서 다시 꺼내기 (평가가 남아 있으면 사분면으로, 없으면 트레이로) */
export function unparkNeed(
  data: Stage5LatentNeedsData,
  needId: string,
): Stage5LatentNeedsData {
  if (!data.parkedNeedIds.includes(needId)) return data;
  return {
    ...data,
    parkedNeedIds: data.parkedNeedIds.filter((id) => id !== needId),
  };
}

/** 아직 사분면에 배치되지 않고 보류함에도 없는 잠재 니즈 */
export function unplacedLatentNeeds(
  data: Stage5LatentNeedsData,
): Stage5BoardPostit[] {
  const parked = new Set(data.parkedNeedIds);
  return listLatentNeedPostits(data).filter(
    (p) => !data.needRatings[p.id] && !parked.has(p.id),
  );
}

/** 셀에 배치된 잠재 니즈 (보류 제외) */
export function needsInQuadrantCell(
  data: Stage5LatentNeedsData,
  cell: NeedQuadrantCell,
): Stage5BoardPostit[] {
  const parked = new Set(data.parkedNeedIds);
  return listLatentNeedPostits(data).filter(
    (p) => data.needRatings[p.id]?.cell === cell && !parked.has(p.id),
  );
}

/** 보류함의 잠재 니즈 */
export function parkedLatentNeeds(
  data: Stage5LatentNeedsData,
): Stage5BoardPostit[] {
  const byId = new Map(data.postits.map((p) => [p.id, p] as const));
  return data.parkedNeedIds
    .map((id) => byId.get(id))
    .filter(
      (p): p is Stage5BoardPostit =>
        Boolean(p) && p!.kind === "latent_need" && Boolean(p!.text.trim()),
    );
}

/** 니즈 id → 소속 그룹명 */
export function needGroupNameMap(
  data: Stage5LatentNeedsData,
): Map<string, string> {
  const map = new Map<string, string>();
  const groupById = new Map(data.needGroups.map((g) => [g.id, g] as const));
  for (const [groupId, ids] of Object.entries(data.needGroupMemberIds ?? {})) {
    const group = groupById.get(groupId);
    if (!group) continue;
    for (const id of ids) map.set(id, group.name);
  }
  return map;
}

/** 핵심 선별이 실제 적용됐는지 (7단계 필터 기준) */
export function hasCoreSelection(data: Stage5LatentNeedsData): boolean {
  return data.coreNeedIds.length > 0;
}
