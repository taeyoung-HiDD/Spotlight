import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";

export const CONTEXTUAL_RESEARCH_TITLE = "사전 리서치 (Contextual Research)";

export const CONTEXTUAL_RESEARCH_CAPTION =
  "현장 리서치 전, 충분한 사전 준비를 통해 배경 지식을 쌓고 효율적인 현장 리서치를 준비합니다.";

export type ContextualResearchGuidelineId =
  | "market_trends"
  | "case_studies"
  | "target_profile"
  | "related_presurvey";

export interface ContextualResearchGuideline {
  order: number;
  id: ContextualResearchGuidelineId;
  title: string;
  badge?: string;
  description: string;
  dimensionIds: readonly ContextualDimensionId[];
}

/** HCI·워크북 사전 리서치 4단계 — 맥락 이해하기 생성 가이드 */
export const CONTEXTUAL_RESEARCH_GUIDELINES: ContextualResearchGuideline[] = [
  {
    order: 1,
    id: "market_trends",
    title: "시장 및 트렌드 분석",
    description:
      "관련 시장의 현황, 최신 트렌드, 경쟁사 동향, 해당 지역·문화·역사를 파악합니다. 리서치 방향을 설정하고 현장에서 질문할 핵심 포인트를 도출합니다.",
    dimensionIds: [
      "competitors",
      "environment",
      "policy",
      "infrastructure",
      "products_services",
    ],
  },
  {
    order: 2,
    id: "case_studies",
    title: "유사 사례 연구",
    description:
      "유사한 프로젝트나 제품의 사례를 연구하여 성공과 실패 요인을 분석합니다. 리서치 과정에서 주의할 점과 중점적으로 살펴볼 부분을 파악합니다.",
    dimensionIds: ["competitors", "products_services"],
  },
  {
    order: 3,
    id: "target_profile",
    title: "대상자 프로필 분석",
    badge: "Diary Studies",
    description:
      "선정된 리서치 대상자의 배경, 라이프스타일, 사용 패턴 등을 사전에 분석합니다. 맞춤형 질문을 준비하고 더 깊은 인사이트를 얻을 수 있습니다.",
    dimensionIds: ["primary_users", "situation"],
  },
  {
    order: 4,
    id: "related_presurvey",
    title: "관련 대상자 사전 조사",
    description:
      "해외·낯선 맥락일 경우 현지인이나 전문가와 만나 사전 이해를 돕습니다. 현지 조사 시 유의할 점을 파악합니다.",
    dimensionIds: ["stakeholders", "environment"],
  },
];

const DIMENSION_TO_GUIDELINE = new Map<ContextualDimensionId, ContextualResearchGuideline>();

for (const g of CONTEXTUAL_RESEARCH_GUIDELINES) {
  for (const id of g.dimensionIds) {
    if (!DIMENSION_TO_GUIDELINE.has(id)) {
      DIMENSION_TO_GUIDELINE.set(id, g);
    }
  }
}

export function getGuidelineForDimension(
  dimensionId: ContextualDimensionId,
): ContextualResearchGuideline {
  return (
    DIMENSION_TO_GUIDELINE.get(dimensionId) ??
    CONTEXTUAL_RESEARCH_GUIDELINES[0]
  );
}

export function getAllGuidelinesForDimension(
  dimensionId: ContextualDimensionId,
): ContextualResearchGuideline[] {
  return CONTEXTUAL_RESEARCH_GUIDELINES.filter((g) =>
    g.dimensionIds.includes(dimensionId),
  );
}

/** AI·휴리스틱 조사 프롬프트용 */
export function buildDimensionGuidelinePrompt(
  dimensionId: ContextualDimensionId,
): string {
  const matched = getAllGuidelinesForDimension(dimensionId);
  const primary = matched[0] ?? CONTEXTUAL_RESEARCH_GUIDELINES[0];
  const extra =
    matched.length > 1
      ? `\n- 보조 가이드: ${matched
          .slice(1)
          .map((g) => `${g.order}. ${g.title}`)
          .join(" · ")}`
      : "";

  return `
[사전 리서치 가이드 — ${primary.order}. ${primary.title}]
${primary.description}
- 이 조사 영역(${dimensionId})의 메모는 위 가이드에 맞춰 작성하세요.${extra}`.trim();
}

export function formatGuidelinesForCoach(): string {
  return CONTEXTUAL_RESEARCH_GUIDELINES.map(
    (g) =>
      `${g.order}. ${g.title}${g.badge ? ` (+ ${g.badge})` : ""}\n${g.description}`,
  ).join("\n\n");
}

export function formatGuidelinesCompact(): string {
  return CONTEXTUAL_RESEARCH_GUIDELINES.map(
    (g) => `${g.order}. ${g.title}`,
  ).join(" · ");
}

/** 자동 선정 시 최소 커버리지 */
export const MARKET_TREND_DIMENSIONS: ContextualDimensionId[] = [
  "competitors",
  "environment",
  "products_services",
];

export const CASE_STUDY_DIMENSIONS: ContextualDimensionId[] = [
  "competitors",
  "products_services",
];
