/**
 * CORE 2 — 리서치 방법별 권장 조사 인원.
 * 방법마다 시간·깊이·포화 기준이 달라 단일 총원만으로는 부족하다.
 */

import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import { isDtFieldResearchMethod } from "@/lib/stages/fieldResearch/researchMethodCatalog";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";

const REASON_MAX = 240;

export type MethodParticipantRecommendation = {
  count: number;
  reason: string;
};

export type MethodParticipantRecommendations = Partial<
  Record<ResearchMethodId, MethodParticipantRecommendation>
>;

/** 방법별 기본 권장 구간 (정성 현장 조사) */
const METHOD_COUNT_DEFAULTS: Partial<
  Record<ResearchMethodId, { min: number; max: number; typical: number }>
> = {
  home_visit_in_depth: { min: 5, max: 8, typical: 6 },
  shadowing: { min: 3, max: 5, typical: 4 },
  be_the_customer: { min: 1, max: 1, typical: 1 },
  fgd: { min: 6, max: 10, typical: 8 },
  survey: { min: 30, max: 100, typical: 50 },
  desk_research: { min: 0, max: 0, typical: 0 },
  other: { min: 3, max: 6, typical: 5 },
};

function clipCount(n: number, methodId: ResearchMethodId): number {
  const def = METHOD_COUNT_DEFAULTS[methodId] ?? { min: 1, max: 30, typical: 5 };
  if (methodId === "be_the_customer" || methodId === "desk_research") {
    return def.typical;
  }
  return Math.min(def.max, Math.max(def.min, Math.round(n)));
}

export function normalizeMethodParticipantRecommendations(
  raw: unknown,
  methodIds: ResearchMethodId[],
): MethodParticipantRecommendations {
  const out: MethodParticipantRecommendations = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const id = key.trim() as ResearchMethodId;
      if (!isDtFieldResearchMethod(id)) continue;
      if (!value || typeof value !== "object") continue;
      const o = value as Record<string, unknown>;
      const count = Math.min(
        30,
        Math.max(0, Math.round(Number(o.count) || 0)),
      );
      const reason =
        typeof o.reason === "string"
          ? sanitizeCoachKoreanText(o.reason.trim()).slice(0, REASON_MAX)
          : "";
      if (count > 0 || id === "be_the_customer") {
        out[id] = {
          count: clipCount(count || 1, id),
          reason,
        };
      }
    }
  }

  // 추천 방법에 빠진 항목은 호출측 ensure에서 채움
  for (const id of methodIds) {
    if (out[id]) continue;
  }
  return out;
}

export function buildHeuristicMethodParticipantRecommendation(
  methodId: ResearchMethodId,
  opts: {
    segmentTotal: number;
    segmentCount: number;
  },
): MethodParticipantRecommendation {
  const { segmentTotal, segmentCount } = opts;
  const def = METHOD_COUNT_DEFAULTS[methodId] ?? {
    min: 3,
    max: 8,
    typical: 5,
  };

  if (methodId === "home_visit_in_depth") {
    const count = clipCount(
      Math.max(def.typical, segmentTotal || def.typical),
      methodId,
    );
    const reason =
      segmentCount > 1
        ? `1:1 홈비짓·인뎁스는 세그먼트 ${segmentCount}개를 비교하려면 ${def.min}~${def.max}명이 적당해요. 극단·대조를 나눠 총 ${count}명을 권장해요.`
        : `1:1로 깊게 들으려면 ${def.min}~${def.max}명이면 행동 패턴이 반복해서 드러나요. 깊이 있는 대화가 가능한 ${count}명을 권장해요.`;
    return {
      count,
      reason: sanitizeCoachKoreanText(reason).slice(0, REASON_MAX),
    };
  }

  if (methodId === "shadowing") {
    // 섀도잉은 회차당 시간이 길어 인터뷰보다 소수 · 보통 인터뷰 풀의 일부
    const interviewScale = Math.max(def.typical, segmentTotal || def.typical);
    const count = clipCount(
      Math.min(def.max, Math.max(def.min, Math.round(interviewScale * 0.65))),
      methodId,
    );
    const reason = `섀도잉은 회차당 4~6시간 가까이 걸려 ${def.min}~${def.max}명이면 충분해요. 인터뷰 대상 중 극단 ${count}명에 집중해도 말과 행동의 갭을 볼 수 있어요.`;
    return {
      count,
      reason: sanitizeCoachKoreanText(reason).slice(0, REASON_MAX),
    };
  }

  if (methodId === "be_the_customer") {
    return {
      count: 1,
      reason: sanitizeCoachKoreanText(
        "Be the Customer는 모집 인원이 아니라 조사자가 직접 흐름을 따라가 보는 방법이에요. 1회(또는 소수 시나리오)로 마찰 지점을 먼저 체감하면 좋아요.",
      ).slice(0, REASON_MAX),
    };
  }

  const count = clipCount(def.typical, methodId);
  return {
    count,
    reason: sanitizeCoachKoreanText(
      `이 방법은 보통 ${def.min}~${def.max}명 안팎에서 패턴이 드러나 ${count}명을 권장해요.`,
    ).slice(0, REASON_MAX),
  };
}

export function buildHeuristicMethodParticipantRecommendations(
  methodIds: ResearchMethodId[],
  opts: { segmentTotal: number; segmentCount: number },
): MethodParticipantRecommendations {
  const out: MethodParticipantRecommendations = {};
  for (const id of methodIds) {
    out[id] = buildHeuristicMethodParticipantRecommendation(id, opts);
  }
  return out;
}

/** 모집 목표(스펙트럼 총원) — 사용자 모집이 필요한 방법 중 최댓값 */
export function recruitmentTargetFromMethodCounts(
  recommendations: MethodParticipantRecommendations,
  methodIds: ResearchMethodId[],
  fallback: number,
): number {
  let max = 0;
  for (const id of methodIds) {
    if (id === "be_the_customer" || id === "desk_research") continue;
    const n = recommendations[id]?.count ?? 0;
    if (n > max) max = n;
  }
  if (max > 0) return max;
  return Math.min(30, Math.max(1, fallback));
}

export function buildRecruitmentParticipantReason(
  recommendations: MethodParticipantRecommendations,
  methodIds: ResearchMethodId[],
  targetCount: number,
): string {
  const parts: string[] = [];
  for (const id of methodIds) {
    const rec = recommendations[id];
    if (!rec) continue;
    if (id === "home_visit_in_depth") parts.push(`인터뷰 ${rec.count}명`);
    else if (id === "shadowing") parts.push(`섀도잉 ${rec.count}명`);
    else if (id === "be_the_customer") parts.push("직접 체험 1회");
  }
  const detail = parts.length ? parts.join(" · ") : `${targetCount}명`;
  return sanitizeCoachKoreanText(
    `방법별로 권장 인원이 달라요(${detail}). 같은 대상을 여러 방법에 쓸 수 있으니, 모집 목표는 가장 많은 인원이 필요한 방법 기준으로 ${targetCount}명이에요.`,
  ).slice(0, REASON_MAX);
}

export function hasMissingMethodParticipantRecommendations(
  methodIds: ResearchMethodId[],
  recommendations: MethodParticipantRecommendations | undefined,
): boolean {
  if (!methodIds.length) return false;
  const rec = recommendations ?? {};
  return methodIds.some((id) => {
    const item = rec[id];
    if (!item) return true;
    if (id !== "be_the_customer" && item.count < 1) return true;
    if (!item.reason.trim()) return true;
    return false;
  });
}

/**
 * 방법별 권장 인원이 비었거나 이유가 없으면 휴리스틱으로 채운다.
 * AI가 준 유효한 count·reason은 유지한다.
 */
export function ensureMethodParticipantRecommendations(
  methodIds: ResearchMethodId[],
  existing: MethodParticipantRecommendations | undefined,
  opts: { segmentTotal: number; segmentCount: number },
): {
  methodParticipantRecommendations: MethodParticipantRecommendations;
  recommendedParticipantCount: number;
  participantCountReason: string;
} {
  const next: MethodParticipantRecommendations = { ...(existing ?? {}) };
  for (const id of methodIds) {
    const cur = next[id];
    const heuristic = buildHeuristicMethodParticipantRecommendation(id, opts);
    if (!cur || cur.count < 1) {
      next[id] = heuristic;
      continue;
    }
    next[id] = {
      count: clipCount(cur.count, id),
      reason: cur.reason.trim()
        ? sanitizeCoachKoreanText(cur.reason).slice(0, REASON_MAX)
        : heuristic.reason,
    };
  }

  const recommendedParticipantCount = recruitmentTargetFromMethodCounts(
    next,
    methodIds,
    opts.segmentTotal || 5,
  );
  const participantCountReason = buildRecruitmentParticipantReason(
    next,
    methodIds,
    recommendedParticipantCount,
  );

  return {
    methodParticipantRecommendations: next,
    recommendedParticipantCount,
    participantCountReason,
  };
}
