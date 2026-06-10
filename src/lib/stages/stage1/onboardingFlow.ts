import {
  coachAskWithExamples,
  formatCoachDialogBreaks,
} from "@/lib/coach/formatCoachDialog";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import { DISPLAY_NAME_FALLBACK } from "@/lib/users/displayName";
import { STAGE1_CUSTOMER_PROBLEM_RATIONALE } from "@/lib/stages/stage1/customerProblemRationale";
import {
  LEVEL_DIAGNOSTIC_QUESTIONS,
  levelCoachingPaceMessage,
  resolveCoachingLevel,
  scoreDiagnosticAnswer,
  type DiagnosticQuestionId,
  type UserCoachingLevel,
} from "@/lib/stages/stage1/levelDiagnostic";

export type OnboardingStep =
  | "diagnostic_dt_flow"
  | "diagnostic_research"
  | "diagnostic_ideation"
  | "done";

export interface Stage1OnboardingResult {
  displayName: string;
  userLevel: UserCoachingLevel;
  diagnosticScores: Record<DiagnosticQuestionId, number>;
  skippedDiagnostic: boolean;
}

export interface Stage1OnboardingDraft {
  displayName: string;
  answers: Partial<Record<DiagnosticQuestionId, string>>;
  scores: number[];
  skippedDiagnostic: boolean;
}

const SKIP_PATTERN = /건너뛰|패스|나중에|skip|모르겠.*전체/i;

export function isSkipDiagnostic(text: string): boolean {
  return SKIP_PATTERN.test(text.trim());
}

function askWithGuide(question: string, guide: CoachInputGuide): string {
  return coachAskWithExamples(question, guide.examples);
}

function coachName(displayName: string): string {
  return displayName.trim() || DISPLAY_NAME_FALLBACK;
}

const ONBOARDING_GUIDES: Record<OnboardingStep, CoachInputGuide> = {
  diagnostic_dt_flow: {
    title: "디자인씽킹 흐름 · 예시",
    hint: "경험에 가장 가까운 말로 짧게. 모르겠으면 「처음이에요」도 괜찮아요.",
    examples: ["처음이에요", "워크숍에서 한 번 해봤어요", "익숙해요", "진단 건너뛰기"],
    placeholder: "경험을 한 줄로…",
  },
  diagnostic_research: {
    title: "리서치 · 예시",
    hint: "세 질문 모두 비슷하게 답해 주시면 돼요.",
    examples: ["인터뷰는 없어요", "가끔 주변에게 물어봤어요", "사용자 조사 여러 번", "진단 건너뛰기"],
    placeholder: "경험을 한 줄로…",
  },
  diagnostic_ideation: {
    title: "아이디어 발산 · 예시",
    examples: ["거의 안 해봤어요", "회의에서 포스트잇 써봤어요", "브레인스토밍 자주 해요", "진단 건너뛰기"],
    placeholder: "경험을 한 줄로…",
  },
  done: {
    title: "입력",
    examples: [],
    placeholder: "",
  },
};

export function getOnboardingInputGuide(step: OnboardingStep): CoachInputGuide {
  return ONBOARDING_GUIDES[step];
}

/** 회원 프로필 이름으로 진단 첫 질문 시작 */
export function diagnosticKickoffCoachMessage(displayName: string): string {
  const name = coachName(displayName);
  const q = LEVEL_DIAGNOSTIC_QUESTIONS[0]!;
  return askWithGuide(
    `${name}님, 반가워요.\n\n맞춤 코칭을 위해 짧은 질문 세 가지만 할게요.\n\n${q.coachQuestion}`,
    ONBOARDING_GUIDES.diagnostic_dt_flow,
  );
}

/** 출발 문제점 입력 직후 — 환영 멘트 없이 진단으로 */
export function diagnosticKickoffCoachMessageAfterProblem(
  displayName: string,
): string {
  const name = coachName(displayName);
  const q = LEVEL_DIAGNOSTIC_QUESTIONS[0]!;
  return askWithGuide(
    `${name}님, 이어서 맞춤 코칭을 위해 짧은 질문 세 가지만 할게요.\n\n${q.coachQuestion}`,
    ONBOARDING_GUIDES.diagnostic_dt_flow,
  );
}

const STEP_ORDER: OnboardingStep[] = [
  "diagnostic_dt_flow",
  "diagnostic_research",
  "diagnostic_ideation",
];

function diagnosticIdForStep(step: OnboardingStep): DiagnosticQuestionId | null {
  if (step === "diagnostic_dt_flow") return "dt_flow";
  if (step === "diagnostic_research") return "research";
  if (step === "diagnostic_ideation") return "ideation";
  return null;
}

function nextOnboardingStep(step: OnboardingStep): OnboardingStep | "done" {
  const i = STEP_ORDER.indexOf(step);
  if (i < 0 || i >= STEP_ORDER.length - 1) return "done";
  return STEP_ORDER[i + 1]!;
}

export function advanceOnboarding(
  step: OnboardingStep,
  userText: string,
  draft: Stage1OnboardingDraft,
): {
  patch: Partial<Stage1OnboardingDraft>;
  nextStep: OnboardingStep | "done";
  coachReply: string;
  result?: Stage1OnboardingResult;
} {
  const text = userText.trim();
  if (!text) {
    return {
      patch: {},
      nextStep: step,
      coachReply: "편하게 한두 단어만 적어 주셔도 돼요.",
    };
  }

  const qId = diagnosticIdForStep(step);
  if (!qId) {
    return { patch: {}, nextStep: step, coachReply: "다시 한번 말씀해 주세요." };
  }

  const resolvedName = coachName(draft.displayName);

  if (isSkipDiagnostic(text)) {
    const result: Stage1OnboardingResult = {
      displayName: resolvedName,
      userLevel: "beginner",
      diagnosticScores: {
        dt_flow: 0,
        research: 0,
        ideation: 0,
      },
      skippedDiagnostic: true,
    };
    return {
      patch: { skippedDiagnostic: true, scores: [0, 0, 0] },
      nextStep: "done",
      coachReply: finishOnboardingMessage(result),
      result,
    };
  }

  const score = scoreDiagnosticAnswer(text);
  const scores = [...draft.scores, score];
  const answers = { ...draft.answers, [qId]: text };
  const next = nextOnboardingStep(step);

  if (next === "done") {
    const diagnosticScores = {
      dt_flow: scores[0] ?? 0,
      research: scores[1] ?? 0,
      ideation: scores[2] ?? 0,
    };
    const userLevel = resolveCoachingLevel(scores, false);
    const result: Stage1OnboardingResult = {
      displayName: resolvedName,
      userLevel,
      diagnosticScores,
      skippedDiagnostic: false,
    };
    return {
      patch: { answers, scores, skippedDiagnostic: false },
      nextStep: "done",
      coachReply: finishOnboardingMessage(result),
      result,
    };
  }

  const nextQ = LEVEL_DIAGNOSTIC_QUESTIONS.find(
    (q) =>
      (next === "diagnostic_research" && q.id === "research") ||
      (next === "diagnostic_ideation" && q.id === "ideation"),
  )!;

  return {
    patch: { answers, scores },
    nextStep: next,
    coachReply: askWithGuide(
      `고마워요.\n\n다음 질문이에요.\n\n${nextQ.coachQuestion}`,
      ONBOARDING_GUIDES[next],
    ),
  };
}

function finishOnboardingMessage(result: Stage1OnboardingResult): string {
  const name = result.displayName;
  const pace = levelCoachingPaceMessage(result.userLevel, {
    skippedDiagnostic: result.skippedDiagnostic,
  });

  return formatCoachDialogBreaks(
    [
      `${name}님, 고마워요.\n\n${pace}`,
      STAGE1_CUSTOMER_PROBLEM_RATIONALE,
      "이제 아까 정리한 문제점을 다시 보여 드리면서 프로젝트 이름을 정하고, 팀 여부·Hopes·Fears로 이어갈게요.",
      "아래 「다음으로 이동」을 누르면 이어서 진행할게요.",
    ].join("\n\n"),
  );
}
