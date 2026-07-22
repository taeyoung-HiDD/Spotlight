import {
  buildToKnowTable,
  TO_KNOW_V5_BIGS,
  defaultMethodForToKnowV5Big,
  getToKnowV5BigHint,
  getToKnowV5BigLabel,
  type ToKnowBuildContext,
} from "@/lib/stages/fieldResearch/toKnowCatalogV5";
import type {
  ResearchMethodId,
  ToKnowBigCategoryId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

/** To-know 표 자동 시드 입력 (2단계 맥락 + v5 분류) */
export type ToKnowSeedContext = ToKnowBuildContext & {
  discovery?: {
    targetPerson: string;
    situation: string;
    stakeholders: string;
    competitiveContext: string;
  };
};

/** To-know v5 대분류 */
export const TO_KNOW_PRIMARY_BIGS: ToKnowBigCategoryId[] = [
  ...TO_KNOW_V5_BIGS,
];

export function buildAdaptedToKnowTable(ctx: ToKnowSeedContext): ToKnowRow[] {
  return buildToKnowTable(ctx);
}

const BIG_LABELS: Partial<Record<ToKnowBigCategoryId, string>> = {
  company: "Company",
  customer: "Customer (Buyer)",
  competitor: "Competitor",
  new_comer: "New Comer",
  supplier: "Supplier",
  persona_basics: "기본 정보 (→ 대1 대상)",
  lifestyle: "라이프스타일 (→ 대1 대상)",
  surrounding_context: "맥락 (→ 대1 대상)",
  problem_perception_behavior: "문제 인식·행태 (→ 대1 대상)",
};

const BIG_HINTS: Partial<Record<ToKnowBigCategoryId, string>> = {
  company: "레거시 · 대분류 「회사」로 이전 권장",
  customer: "레거시 · 대분류 「대상」으로 이전 권장",
  competitor: "레거시 · 대분류 「경쟁사·서비스」로 이전 권장",
  new_comer: "레거시 · 대분류 「경쟁사·서비스」로 이전 권장",
  supplier: "레거시 · 대분류 「정책·인프라」로 이전 권장",
};

export function getToKnowBigCategoryLabel(
  big: ToKnowBigCategoryId,
  _ctx?: ToKnowSeedContext,
): string {
  const v5 = getToKnowV5BigLabel(big);
  if (v5 !== big) return v5;
  return BIG_LABELS[big] ?? big;
}

export function getToKnowBigCategoryHint(big: ToKnowBigCategoryId): string {
  const v5 = getToKnowV5BigHint(big);
  if (v5) return v5;
  return BIG_HINTS[big] ?? "";
}

export function defaultMethodForToKnowBig(
  big: ToKnowBigCategoryId,
): ResearchMethodId | "" {
  const v5 = defaultMethodForToKnowV5Big(big);
  if (v5) return v5;
  return "desk_research";
}
