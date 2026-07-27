import type { Stage4PersonaEmpathyMap } from "@/lib/stages/stage4/types";
import type { Stage3ResearchPrep } from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import type { SelectionCriterionDetail } from "@/lib/stages/fieldResearch/selectionProfile";

export type RespondentRole = "heavy" | "light" | "control" | "secondary";
export type RespondentRecruitStatus = "recruited" | "pending" | "open";

export interface Respondent {
  id: string;
  shortLabel: string;
  name: string;
  /** 특성 한 줄 (title 역할) */
  subtitle: string;
  role: RespondentRole;
  recruitStatus: RespondentRecruitStatus;
  consentReceived: boolean;
  /** 이 유형에 배정된 조사 인원 */
  participantCount: number;
  /**
   * 선정 기준 칩 — selectionProfile.selectionCriteria
   * (segmentation_variables와 동일 스키마)
   */
  selectionCriteria: string[];
  /** 칩별 「왜 이 대상에 이 기준인가」 */
  criterionDetails: SelectionCriterionDetail[];
  /**
   * 선정 이유 — selectionProfile.reasoning
   * (segment.reason / reasoning과 동일 스키마)
   */
  reasoning: string;
}

export type LogEntryKind = "behavior" | "quote" | "note";

export interface SessionLogEntry {
  id: string;
  time: string;
  body: string;
  kind: LogEntryKind;
  quoteTag?: string;
}

export interface SessionDebriefing {
  surprise: string;
  keyQuote: string;
  nextCheck: string;
}

export interface RespondentSession {
  place: string;
  method: string;
  timeRange: string;
  logEntries: SessionLogEntry[];
  debriefing: SessionDebriefing;
  completed: boolean;
}

export type ResearchMethodId =
  | "desk_research"
  | "survey"
  | "fgd"
  | "home_visit_in_depth"
  | "shadowing"
  | "be_the_customer"
  | "other";

export interface ResearchMethodPlan {
  id: ResearchMethodId;
  /** 예: 'B2B 재고관리 SaaS 경쟁사' */
  label: string;
  /** 왜 이 방법인지(간단) */
  rationale: string;
}

export type ToKnowBigCategoryId =
  /** To-know v5 대분류 */
  | "tk_target"
  | "tk_company"
  | "tk_region"
  | "tk_policy_infra"
  | "tk_competitor"
  /** Porter 5 driving forces — 레거시 */
  | "company"
  | "customer"
  | "competitor"
  | "new_comer"
  | "supplier"
  /** (구) 페르소나 4축 대분류 — 로드 시 Customer 중분류로 이전 */
  | "persona_basics"
  | "lifestyle"
  | "surrounding_context"
  | "problem_perception_behavior"
  // (기존 5카테고리 호환)
  | "goal"
  | "context"
  | "behavior"
  | "need"
  | "reaction"
  // (레거시·확장)
  | "profile"
  | "mobility_vehicle_use"
  | "purchasing_behavior"
  | "car_perception"
  | "sdv_ev_perception"
  | "country_characteristics"
  | "reality"
  | "topic_thinking"
  | "topic_behavior"
  | "decision"
  | "alternatives";

export type ToKnowRowKind = "core" | "info";

export interface ToKnowRow {
  id: string;
  /** 대분류 (To-know v5 · Porter 레거시) */
  big: ToKnowBigCategoryId;
  /** 가이드 주제(사용자·현재 문제 등) 또는 사용자 지정 주제 */
  mid: string;
  /** core: 핵심 질문 · info: 파악하고자 하는 정보(하위 카테고리) */
  rowKind?: ToKnowRowKind;
  /** 대상·역할 구분 (예: 예비 창업자, 스타트업 팀원, 창업 멘토) */
  infoCategory?: string;
  /** core → 핵심 질문 · info → 파악하고자 하는 정보(질문) */
  small: string;
  /** 이 항목을 확인할 리서치 방법 */
  method: ResearchMethodId | "";
  /** info 행의 보조 메모(선택) */
  note?: string;
}

export type Stage3PrepWorkflowPhase = "research_prep" | "to_know";

export type ToKnowPrepPhase = "discovery" | "draft_shown" | "refining";

export type ToKnowDiscoveryStep =
  | "alignment"
  | "target"
  | "situation"
  | "stakeholders"
  | "competitive"
  | "done";

/** To-know — 코치 대화로 맥락 수집 후 초안 생성 */
export interface ToKnowPrepState {
  phase: ToKnowPrepPhase;
  step: ToKnowDiscoveryStep;
  targetPerson: string;
  situation: string;
  stakeholders: string;
  competitiveContext: string;
}

export interface FieldResearchData {
  /** 사용자 조사 준비 — 조사 계획 → To-know 순서 */
  prepWorkflowPhase: Stage3PrepWorkflowPhase;
  /** 조사 대상·인원·경로·가이드 */
  researchPrep: Stage3ResearchPrep;
  /** (레거시) 사전 조사 타겟 유저별 공감맵 — 4단계에서 사용 */
  empathyMaps: Stage4PersonaEmpathyMap[];
  /** To-know 맥락 수집·초안 단계 */
  toKnowPrep: ToKnowPrepState;
  /**
   * To-know 최상위 — 최종적으로 풀고자 하는 사용자 문제(1단계 문제점 기반).
   * 주제(사용자·현재 문제 등) 하위가 아닌 페이지 전체 기준점.
   */
  toKnowCoreQuestion: string;
  /** 사용자 조사 준비하기 — To-know Table (주제별 파악 정보 + 방법) */
  toKnowTable: ToKnowRow[];
  /**
   * 주제(문제 정의) 맞춤 질문(researchPrep.topicQuestions)으로 표를 교체했는지.
   * true면 재진입 시 도메인 중립 템플릿 시드를 다시 병합하지 않음.
   */
  toKnowTopicApplied: boolean;
  /** 사용자 조사 준비하기 — 조사 계획(방법 + 간단 이유) */
  researchMethods: ResearchMethodPlan[];
  /** 리서치 진행을 위한 간단한 가이드(질문/관찰 포인트/금지사항 등) */
  researchProtocol: string;
  /** 위 3가지 준비를 완료했다고 체크 */
  prepConfirmed: boolean;

  respondents: Respondent[];
  allConsentConfirmed: boolean;
  activeRespondentId: string;
  sessions: Record<string, RespondentSession>;
}
