import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import type {
  ResearchMethodId,
  ToKnowBigCategoryId,
} from "@/lib/stages/fieldResearch/types";

export const DIMENSION_TO_TO_KNOW_BIG: Record<
  ContextualDimensionId,
  ToKnowBigCategoryId
> = {
  primary_users: "tk_target",
  stakeholders: "tk_target",
  situation: "tk_target",
  environment: "tk_region",
  competitors: "tk_competitor",
  products_services: "tk_competitor",
  policy: "tk_policy_infra",
  infrastructure: "tk_policy_infra",
};

export const DIMENSION_DEFAULT_METHOD: Record<
  ContextualDimensionId,
  ResearchMethodId
> = {
  primary_users: "home_visit_in_depth",
  stakeholders: "home_visit_in_depth",
  situation: "shadowing",
  environment: "desk_research",
  competitors: "desk_research",
  products_services: "desk_research",
  policy: "desk_research",
  infrastructure: "desk_research",
};
