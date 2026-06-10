import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import type {
  ResearchMethodId,
  ToKnowBigCategoryId,
} from "@/lib/stages/fieldResearch/types";

export const DIMENSION_TO_CREMA_BIG: Record<
  ContextualDimensionId,
  ToKnowBigCategoryId
> =
  {
    primary_users: "crema_target",
    stakeholders: "crema_target",
    situation: "crema_target",
    environment: "crema_region",
    competitors: "crema_competitor",
    products_services: "crema_competitor",
    policy: "crema_policy_infra",
    infrastructure: "crema_policy_infra",
  };

export const DIMENSION_DEFAULT_METHOD: Record<
  ContextualDimensionId,
  ResearchMethodId
> = {
  primary_users: "home_visit_in_depth",
  stakeholders: "fgd",
  situation: "shadowing",
  environment: "desk_research",
  competitors: "desk_research",
  products_services: "desk_research",
  policy: "desk_research",
  infrastructure: "desk_research",
};
