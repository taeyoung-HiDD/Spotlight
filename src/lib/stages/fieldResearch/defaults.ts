import type {
  FieldResearchData,
  ToKnowPrepState,
} from "@/lib/stages/fieldResearch/types";
import { emptyStage3ResearchPrep } from "@/lib/stages/fieldResearch/stage3ResearchPrep";

export const DEFAULT_TO_KNOW_PREP: ToKnowPrepState = {
  phase: "discovery",
  step: "alignment",
  targetPerson: "",
  situation: "",
  stakeholders: "",
  competitiveContext: "",
};

export const DEFAULT_FIELD_RESEARCH: FieldResearchData = {
  prepWorkflowPhase: "research_prep",
  researchPrep: emptyStage3ResearchPrep(),
  empathyMaps: [],
  toKnowPrep: { ...DEFAULT_TO_KNOW_PREP },
  toKnowCoreQuestion: "",
  toKnowTable: [],
  toKnowTopicApplied: false,
  researchMethods: [],
  researchProtocol: "",
  prepConfirmed: false,
  /** CORE 2 Extreme User는 researchPrep.segments에서 생성 — 데모 식당/카페 샘플 사용 안 함 */
  respondents: [],
  allConsentConfirmed: false,
  activeRespondentId: "",
  sessions: {},
};

export const RESPONDENT_TARGET = 5;
export const SESSION_PASS_RATIO = 0.6;
