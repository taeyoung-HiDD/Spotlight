import {
  CONTEXTUAL_DIMENSIONS,
  type ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import {
  CASE_STUDY_DIMENSIONS,
  MARKET_TREND_DIMENSIONS,
} from "@/lib/stages/stage2/contextualResearchGuidelines";

const BASE_SCORE: Record<ContextualDimensionId, number> = {
  primary_users: 10,
  situation: 9,
  stakeholders: 4,
  environment: 5,
  competitors: 5,
  products_services: 4,
  policy: 2,
  infrastructure: 2,
};

type BoostRule = {
  pattern: RegExp;
  boost: Partial<Record<ContextualDimensionId, number>>;
};

const BOOST_RULES: BoostRule[] = [
  {
    pattern: /카페|커피|음식|매장|소비|식당|외식|브런치/u,
    boost: {
      environment: 4,
      competitors: 4,
      products_services: 3,
      stakeholders: 2,
    },
  },
  {
    pattern: /앱|서비스|플랫폼|검색|지도|리뷰|예약|배달/u,
    boost: {
      products_services: 5,
      competitors: 4,
      infrastructure: 3,
    },
  },
  {
    pattern: /학생|직장|주부|부모|노인|청년|사용자|고객/u,
    boost: { primary_users: 2, stakeholders: 3 },
  },
  {
    pattern: /정책|규제|법|인허가|세금|지원/u,
    boost: { policy: 6, stakeholders: 2 },
  },
  {
    pattern: /배송|물류|인프라|키오스크|결제|와이파이|네트워크/u,
    boost: { infrastructure: 5, products_services: 2 },
  },
  {
    pattern: /경쟁|대안|프랜차이즈|시장|점유/u,
    boost: { competitors: 4, environment: 2 },
  },
  {
    pattern: /병원|의료|교육|학교|공공|행정/u,
    boost: { policy: 4, stakeholders: 4, infrastructure: 2 },
  },
];

const MIN_SELECT = 4;
const MAX_SELECT = 6;

const REQUIRED: ContextualDimensionId[] = ["primary_users", "situation"];

/** 1단계 문제점 기준 — 사전 조사할 영역 자동 선정 */
export function selectContextualDimensions(problem: string): ContextualDimensionId[] {
  const text = problem.trim().toLowerCase();
  const scores = { ...BASE_SCORE };

  for (const rule of BOOST_RULES) {
    if (!rule.pattern.test(text)) continue;
    for (const [id, delta] of Object.entries(rule.boost) as [
      ContextualDimensionId,
      number,
    ][]) {
      scores[id] = (scores[id] ?? 0) + delta;
    }
  }

  if (!text) {
    return ["primary_users", "situation", "environment", "competitors"];
  }

  const ranked = CONTEXTUAL_DIMENSIONS.map((d) => ({
    id: d.id,
    score: scores[d.id] ?? 0,
  })).sort((a, b) => b.score - a.score);

  const picked = new Set<ContextualDimensionId>(REQUIRED);
  for (const { id } of ranked) {
    if (picked.size >= MAX_SELECT) break;
    picked.add(id);
  }

  while (picked.size < MIN_SELECT) {
    const next = ranked.find((r) => !picked.has(r.id));
    if (!next) break;
    picked.add(next.id);
  }

  // 가이드 1·2단계: 시장·트렌드 + 유사 사례 커버
  if (!MARKET_TREND_DIMENSIONS.some((id) => picked.has(id))) {
    picked.add("competitors");
  }
  if (!CASE_STUDY_DIMENSIONS.some((id) => picked.has(id))) {
    picked.add("products_services");
  }

  // 가이드 4단계: 해외·현지 맥락이면 이해 관계자 포함
  if (/(해외|현지|글로벌|외국|international|abroad)/iu.test(text)) {
    picked.add("stakeholders");
  }

  return CONTEXTUAL_DIMENSIONS.filter((d) => picked.has(d.id)).map(
    (d) => d.id,
  );
}

export function formatSelectedDimensionsLabel(ids: ContextualDimensionId[]): string {
  return ids
    .map((id) => CONTEXTUAL_DIMENSIONS.find((d) => d.id === id)?.label ?? id)
    .join(", ");
}
