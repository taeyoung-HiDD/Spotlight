import {
  buildCremaToKnowTable,
  CREMA_TO_KNOW_BIGS,
  defaultMethodForCremaBig,
  getCremaToKnowBigHint,
  getCremaToKnowBigLabel,
  type CremaToKnowBuildContext,
} from "@/lib/stages/fieldResearch/cremaToKnowV5";
import type {
  ResearchMethodId,
  ToKnowBigCategoryId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

/** To-know 표 자동 시드 입력 (CREMA v5 + 2단계 맥락) */
export type ToKnowSeedContext = CremaToKnowBuildContext & {
  discovery?: {
    targetPerson: string;
    situation: string;
    stakeholders: string;
    competitiveContext: string;
  };
};

/** CREMA v5 대분류 (crema_to_know_list_v5.xlsx) */
export const TO_KNOW_PRIMARY_BIGS: ToKnowBigCategoryId[] = [
  ...CREMA_TO_KNOW_BIGS,
];

export function buildAdaptedToKnowTable(ctx: ToKnowSeedContext): ToKnowRow[] {
  return buildCremaToKnowTable(ctx);
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
  company: "레거시 · CREMA 대2 회사로 이전 권장",
  customer: "레거시 · CREMA 대1 대상으로 이전 권장",
  competitor: "레거시 · CREMA 대5로 이전 권장",
  new_comer: "레거시 · CREMA 대5로 이전 권장",
  supplier: "레거시 · CREMA 대4로 이전 권장",
};

export function getToKnowBigCategoryLabel(
  big: ToKnowBigCategoryId,
  _ctx?: ToKnowSeedContext,
): string {
  const crema = getCremaToKnowBigLabel(big);
  if (crema !== big) return crema;
  return BIG_LABELS[big] ?? big;
}

export function getToKnowBigCategoryHint(big: ToKnowBigCategoryId): string {
  const crema = getCremaToKnowBigHint(big);
  if (crema) return crema;
  return BIG_HINTS[big] ?? "";
}

export function defaultMethodForToKnowBig(
  big: ToKnowBigCategoryId,
): ResearchMethodId | "" {
  const crema = defaultMethodForCremaBig(big);
  if (crema) return crema;
  return "desk_research";
}
