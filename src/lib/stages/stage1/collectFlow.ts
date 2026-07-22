import {
  coachAskWithExamples,
  formatCoachDialogBreaks,
} from "@/lib/coach/formatCoachDialog";
import {
  getStage1CollectInputGuide,
  type CoachInputGuide,
} from "@/lib/coach/inputGuidance";
import { STAGE1_CUSTOMER_PROBLEM_RATIONALE } from "@/lib/stages/stage1/customerProblemRationale";
import { DT_PROBLEM_STATEMENT_CAPTURE_HINT } from "@/lib/stages/problemStatement";
import {
  parseTeamCollaborationChoice,
  wantsProjectNameRevision,
} from "@/lib/stages/stage1/teamCollaboration";

export type Stage1CollectStep =
  | "starting_point"
  | "project_name"
  | "team_collaboration"
  | "team_invite";

export interface Stage1CollectedData {
  displayName?: string;
  userLevel?: "beginner" | "expert";
  startingPoint: string;
  projectTitle: string;
  teamWantsCollaboration: boolean | null;
  /** @deprecated Hopes & Fears 단계 제거 — 레거시 저장 호환용 */
  hope: string;
  /** @deprecated Hopes & Fears 단계 제거 — 레거시 저장 호환용 */
  fear: string;
  principleAck: boolean;
}

const PROJECT_TITLE_MAX = 80;

export function normalizeProjectTitle(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, PROJECT_TITLE_MAX);
}

export const STAGE1_PRINCIPLE = {
  match: "결론이 아니라 가설",
  text: "아직 검증 전이에요. 지금은 사람을 더 알아가는 자리 — 솔루션을 확정하지 않아도 괜찮아요.",
};

const AFFIRMATIVE = /^(네|넵|예|응|맞아|맞아요|이해|이해했|이해했어|이해했어요|알겠|알겠어|알겠습니다|ok|okay|yes)\b/i;

export function isAffirmative(text: string): boolean {
  const t = text.trim();
  return AFFIRMATIVE.test(t) || t.length <= 3;
}

function askWithGuide(question: string, guide: CoachInputGuide): string {
  return coachAskWithExamples(question, guide.examples, "처럼 말씀해 주셔도 돼요.");
}

const TEAM_COLLABORATION_QUESTION = [
  "이 문제를 다른 사람들과 팀으로 함께 풀고 싶으신가요?",
  "같이 하시면 초대 링크로 팀원을 부를 수 있어요.",
].join("\n\n");

export const TEAM_INVITE_COACH_MESSAGE = formatCoachDialogBreaks(
  [
    "좋아요. 아래에서 초대 링크를 복사해 팀원에게 보내 주세요.",
    "팀원이 초대를 수락하면 이 프로젝트에 합류해 함께 진행할 수 있어요.",
    "링크를 보내셨으면 아래 「다음으로 진행하기」를 눌러 주세요.",
  ].join("\n\n"),
);

export function collectCompleteCoachReply(): string {
  return formatCoachDialogBreaks(
    [
      "좋아요. 문제 정의와 프로젝트 이름을 정리했어요.",
      "아래 「다음으로 이동」을 누르면 사전 조사 단계로 이어갈게요.",
      "팀원은 내 프로젝트에서 「팀원 초대」로 언제든 부를 수 있어요.",
    ].join("\n\n"),
  );
}

export function problemAfterProjectNameCoachMessage(
  projectTitle: string,
  displayName?: string,
): string {
  const guide = getStage1CollectInputGuide("starting_point");
  const prefix = displayName?.trim() ? `${displayName.trim()}님, ` : "";
  const title = projectTitle.trim();
  return askWithGuide(
    [
      `${prefix}프로젝트 「${title}」 이름 잘 받았어요.`,
      "이제 알고 계신 **사용자 문제**와 떠오른 **아이디어**를 편하게 모두 적어 주세요.",
      DT_PROBLEM_STATEMENT_CAPTURE_HINT,
      "문제만, 아이디어만 있어도 괜찮고, 둘 다 있으면 함께 들려주셔도 돼요. 여러 문장이어도 괜찮아요.",
    ].join("\n\n"),
    guide,
  );
}

/** @deprecated 이름 입력 직후 같은 대화에서 문제·아이디어로 이어감 */
export function projectNameCapturedCoachReply(): string {
  return formatCoachDialogBreaks(
    [
      "좋아요. 프로젝트 이름을 정리했어요.",
      "아래 「다음으로 이동」을 누르면 문제 정의로 이어갈게요.",
    ].join("\n\n"),
  );
}

/** 온보딩 전 · 출발 문제·아이디어 수집 (프로젝트 제목 등 선행 힌트 없음) */
export function firstProblemCaptureCoachMessage(): string {
  const guide = getStage1CollectInputGuide("starting_point");
  return askWithGuide(
    [
      "지금 알고 계신 **사용자 문제**와 떠오른 **아이디어**를 편하게 모두 적어 주세요.",
      DT_PROBLEM_STATEMENT_CAPTURE_HINT,
      "문제만, 아이디어만 있어도 괜찮고, 둘 다 있으면 함께 들려주셔도 돼요. 여러 문장이어도 괜찮아요.",
      "이 내용을 바탕으로 다음 단계 사전 조사를 진행할게요.",
    ].join("\n\n"),
    guide,
  );
}

/** 문제·아이디어 저장 직후 — 이름 질문은 온보딩 단계에서 이어서 함 */
export function problemCaptureCompleteCoachReply(): string {
  return formatCoachDialogBreaks(
    "고마워요. 들려주신 내용을 출발점으로 잡아 두었어요.\n\n아래 「다음으로 이동」을 누르면 사전 조사 단계로 이어갈게요.",
  );
}

export function advanceProblemCapture(userText: string): {
  patch: Partial<Stage1CollectedData>;
  coachReply: string;
} {
  const text = userText.trim();
  if (!text) {
    return {
      patch: {},
      coachReply: "편하게 한두 문장만 더 들려주세요.",
    };
  }
  return {
    patch: { startingPoint: text },
    coachReply: problemCaptureCompleteCoachReply(),
  };
}

export function projectNameRevisionCoachReply(
  startingPoint: string,
  displayName?: string,
): string {
  const guide = getStage1CollectInputGuide("project_name");
  const prefix = displayName?.trim() ? `${displayName.trim()}님, ` : "";
  const problem = startingPoint.trim();
  return askWithGuide(
    [
      `${prefix}알겠어요. 프로젝트 이름을 다시 정해 볼게요.`,
      problem ? `입력해 두신 내용은 그대로 「${problem}」이에요.` : "",
      "목록·팀 초대에 쓸 짧은 프로젝트 이름을 알려주세요.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    guide,
  );
}

const PROJECT_NAME_REVISION_STEPS = new Set<Stage1CollectStep>([
  "team_collaboration",
  "team_invite",
]);

export function firstProjectNameCoachMessage(
  startingPoint: string,
  displayName?: string,
): string {
  const guide = getStage1CollectInputGuide("project_name");
  const prefix = displayName?.trim() ? `${displayName.trim()}님, ` : "";
  const problem = startingPoint.trim();
  if (!problem) {
    return askWithGuide(
      [
        `${prefix}이제 프로젝트 목록에 쓸 이름을 정할게요.`,
        "프로젝트 목록·팀 초대에서 구분할 짧은 이름을 알려주세요.",
      ].join("\n\n"),
      guide,
    );
  }
  return askWithGuide(
    [
      `${prefix}아까 정리해 두신 문제·아이디어를 다시 볼게요.`,
      `「${problem}」`,
      "프로젝트 목록·팀 초대에서 구분할 프로젝트 이름을 정해 주세요. 짧은 제목이면 충분해요.",
    ].join("\n\n"),
    guide,
  );
}

export function firstCollectCoachMessage(
  hasStartingHint: boolean,
  displayName?: string,
): string {
  const guide = getStage1CollectInputGuide("starting_point", hasStartingHint);
  const prefix = displayName?.trim() ? `${displayName.trim()}님, ` : "";
  if (hasStartingHint) {
    return askWithGuide(
      [
        STAGE1_CUSTOMER_PROBLEM_RATIONALE,
        `${prefix}그럼 첫으로, 알고 계신 사용자 문제와 떠오른 아이디어를 모두 들려주세요. 한두 문장이면 충분해요.`,
      ].join("\n\n"),
      guide,
    );
  }
  return askWithGuide(
    [
      STAGE1_CUSTOMER_PROBLEM_RATIONALE,
      `${prefix}그럼 첫으로, 알고 계신 사용자 문제와 떠오른 아이디어를 모두 들려주세요. 한두 문장이면 충분해요.`,
    ].join("\n\n"),
    guide,
  );
}

export function getCollectInputGuideForStep(
  step: Stage1CollectStep,
  hasStartingHint?: boolean,
): CoachInputGuide | undefined {
  if (step === "team_invite") return undefined;
  return getStage1CollectInputGuide(step, hasStartingHint);
}

/** 레거시 collectStep → 현재 단계 */
export function normalizeLegacyCollectStep(
  saved: string,
  state: Pick<
    Stage1CollectedData,
    "startingPoint" | "projectTitle" | "teamWantsCollaboration"
  >,
): Stage1CollectStep {
  if (!state.projectTitle.trim()) return "project_name";
  if (!state.startingPoint.trim()) return "starting_point";

  if (
    saved === "hopes_gate" ||
    saved === "hopes" ||
    saved === "fears" ||
    saved === "principle" ||
    saved === "team_collaboration" ||
    saved === "team_invite"
  ) {
    if (state.projectTitle.trim() && state.startingPoint.trim()) {
      return "project_name";
    }
    if (state.teamWantsCollaboration === true) return "team_invite";
    if (state.projectTitle.trim()) return "project_name";
    return "project_name";
  }
  if (
    saved === "starting_point" ||
    saved === "project_name" ||
    saved === "team_collaboration" ||
    saved === "team_invite"
  ) {
    if (saved === "team_collaboration" || saved === "team_invite") {
      return "project_name";
    }
    return saved;
  }
  return "project_name";
}

export function advanceStage1Collect(
  step: Stage1CollectStep,
  userText: string,
  context?: {
    startingPoint?: string;
    displayName?: string;
    projectTitle?: string;
  },
): {
  patch: Partial<Stage1CollectedData>;
  nextStep: Stage1CollectStep | "done";
  coachReply: string;
} {
  const text = userText.trim();
  if (!text) {
    return {
      patch: {},
      nextStep: step,
      coachReply: "편하게 한두 문장만 더 들려주세요.",
    };
  }

  if (
    wantsProjectNameRevision(text) &&
    PROJECT_NAME_REVISION_STEPS.has(step)
  ) {
    const patch: Partial<Stage1CollectedData> = { projectTitle: "" };
    if (step === "team_collaboration" || step === "team_invite") {
      patch.teamWantsCollaboration = null;
    }
    return {
      patch,
      nextStep: "project_name",
      coachReply: projectNameRevisionCoachReply(
        context?.startingPoint?.trim() ?? "",
        context?.displayName,
      ),
    };
  }

  switch (step) {
    case "starting_point": {
      const projectTitle = context?.projectTitle?.trim() ?? "";
      return {
        patch: { startingPoint: text },
        nextStep: projectTitle ? "done" : "project_name",
        coachReply: projectTitle
          ? collectCompleteCoachReply()
          : firstProjectNameCoachMessage(text, context?.displayName),
      };
    }
    case "project_name": {
      const projectTitle = normalizeProjectTitle(text);
      if (!projectTitle) {
        return {
          patch: {},
          nextStep: "project_name",
          coachReply: askWithGuide(
            "프로젝트 이름을 한 줄로 알려주세요. 예: 지하철 원핸드, 소상공인 재고 도우미",
            getStage1CollectInputGuide("project_name"),
          ),
        };
      }
      if (context?.startingPoint?.trim()) {
        return {
          patch: { projectTitle },
          nextStep: "done",
          coachReply: collectCompleteCoachReply(),
        };
      }
      return {
        patch: { projectTitle },
        nextStep: "starting_point",
        coachReply: problemAfterProjectNameCoachMessage(
          projectTitle,
          context?.displayName,
        ),
      };
    }
    case "team_collaboration": {
      const choice = parseTeamCollaborationChoice(text);
      if (choice === "no") {
        return {
          patch: { teamWantsCollaboration: false },
          nextStep: "done",
          coachReply: collectCompleteCoachReply(),
        };
      }
      if (choice === "yes") {
        return {
          patch: { teamWantsCollaboration: true },
          nextStep: "team_invite",
          coachReply: TEAM_INVITE_COACH_MESSAGE,
        };
      }
      return {
        patch: {},
        nextStep: "team_collaboration",
        coachReply: askWithGuide(
          "팀으로 함께 하고 싶으신지 알려 주세요. 혼자 진행하셔도 괜찮아요.",
          getStage1CollectInputGuide("team_collaboration"),
        ),
      };
    }
    case "team_invite":
      return {
        patch: {},
        nextStep: "team_invite",
        coachReply: formatCoachDialogBreaks(
          "초대 링크는 아래에서 복사할 수 있어요.\n\n보내셨으면 아래 「다음으로 진행하기」를 눌러 주세요.",
        ),
      };
  }
}

/** 초대 UI · 다음 단계로 진행 */
export function advanceFromTeamInvite(): {
  patch: Partial<Stage1CollectedData>;
  nextStep: "done";
  coachReply: string;
} {
  return {
    patch: { teamWantsCollaboration: true },
    nextStep: "done",
    coachReply: collectCompleteCoachReply(),
  };
}
