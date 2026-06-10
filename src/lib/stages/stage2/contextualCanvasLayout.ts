import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import { CONTEXTUAL_RESEARCH_GUIDELINES } from "@/lib/stages/stage2/contextualResearchGuidelines";

export type ContextualCanvasZoneId = "people" | "environment" | "landscape";

export type ContextualCanvasZone = {
  id: ContextualCanvasZoneId;
  title: string;
  lead: string;
  dimensions: readonly ContextualDimensionId[];
  /** 상단 2열 vs 하단 전체 폭 */
  placement: "top" | "bottom";
};

/** 캔버스 3영역 — 좌: 사람 · 우: 환경 · 하: 경쟁 구도·정책·인프라 */
export const CONTEXTUAL_CANVAS_ZONES: ContextualCanvasZone[] = [
  {
    id: "people",
    title: "사람",
    lead: `3. 대상자 프로필 · 4. 관련 대상자 — ${CONTEXTUAL_RESEARCH_GUIDELINES[2].title} · ${CONTEXTUAL_RESEARCH_GUIDELINES[3].title}`,
    dimensions: ["primary_users", "stakeholders"],
    placement: "top",
  },
  {
    id: "environment",
    title: "환경",
    lead: `3. 대상자 맥락 · 1. 시장·지역 — ${CONTEXTUAL_RESEARCH_GUIDELINES[2].title} · ${CONTEXTUAL_RESEARCH_GUIDELINES[0].title}`,
    dimensions: ["situation", "environment"],
    placement: "top",
  },
  {
    id: "landscape",
    title: "경쟁 구도 · 정책 · 인프라",
    lead: `1. 시장·트렌드 · 2. 유사 사례 — ${CONTEXTUAL_RESEARCH_GUIDELINES[0].title} · ${CONTEXTUAL_RESEARCH_GUIDELINES[1].title}`,
    dimensions: [
      "competitors",
      "products_services",
      "policy",
      "infrastructure",
    ],
    placement: "bottom",
  },
];

export const CONTEXTUAL_TOP_ZONES = CONTEXTUAL_CANVAS_ZONES.filter(
  (z) => z.placement === "top",
);

export const CONTEXTUAL_BOTTOM_ZONE = CONTEXTUAL_CANVAS_ZONES.find(
  (z) => z.placement === "bottom",
)!;
