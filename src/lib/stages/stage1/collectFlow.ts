import {
  coachAskWithExamples,
  formatCoachDialogBreaks,
} from "@/lib/coach/formatCoachDialog";
import {
  getStage1CollectInputGuide,
  type CoachInputGuide,
} from "@/lib/coach/inputGuidance";
import { STAGE1_CUSTOMER_PROBLEM_RATIONALE } from "@/lib/stages/stage1/customerProblemRationale";
import {
  parseTeamCollaborationChoice,
  wantsProjectNameRevision,
} from "@/lib/stages/stage1/teamCollaboration";

export type Stage1CollectStep =
  | "starting_point"
  | "project_name"
  | "team_collaboration"
  | "team_invite"
  /** Hopes·Fears 대화 전 — 「다음으로 진행하기」 버튼 대기 */
  | "hopes_gate"
  | "hopes"
  | "fears"
  | "principle";

export interface Stage1CollectedData {
  displayName?: string;
  userLevel?: "beginner" | "expert";
  startingPoint: string;
  projectTitle: string;
  teamWantsCollaboration: boolean | null;
  hope: string;
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
  "같이 하시면 초대 링크로 팀원을 부를 수 있고, 팀원은 Hopes·Fears 단계부터 함께할 수 있어요.",
].join("\n\n");

export const TEAM_INVITE_COACH_MESSAGE = formatCoachDialogBreaks(
  [
    "좋아요. 아래에서 초대 링크를 복사해 팀원에게 보내 주세요.",
    "팀원이 초대를 수락하면 이 프로젝트에 합류하고, Hopes·Fears부터 같이 진행해요.",
    "링크를 보내셨으면 아래 「다음으로 진행하기」를 눌러 주세요.",
  ].join("\n\n"),
);

/** 온보딩 전 · 출발 문제점만 수집 (프로젝트 제목 등 선행 힌트 없음) */
export function firstProblemCaptureCoachMessage(): string {
  const guide = getStage1CollectInputGuide("starting_point");
  return askWithGuide(
    [
      STAGE1_CUSTOMER_PROBLEM_RATIONALE,
      "어떤 고객·상황의 어떤 문제에서 시작할지, 한두 문장으로 직접 말씀해 주세요.",
    ].join("\n\n"),
    guide,
  );
}

/** 문제점 저장 직후 — 이름 질문은 온보딩 단계에서 이어서 함 */
export function problemCaptureCompleteCoachReply(): string {
  return formatCoachDialogBreaks(
    "고마워요. 출발 문제를 잡아 두었어요.\n\n아래 「다음으로 이동」을 누르면 코칭 맞춤 단계로 이어갈게요.",
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
      problem ? `출발 문제점은 그대로 「${problem}」이에요.` : "",
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
  "hopes_gate",
  "hopes",
  "fears",
]);

export function firstProjectNameCoachMessage(
  startingPoint: string,
  displayName?: string,
): string {
  const guide = getStage1CollectInputGuide("project_name");
  const prefix = displayName?.trim() ? `${displayName.trim()}님, ` : "";
  const problem = startingPoint.trim();
  return askWithGuide(
    [
      `${prefix}아까 정리한 출발 문제점을 다시 볼게요.`,
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
        `${prefix}그럼 첫으로, 문제점을 같이 잡아볼게요. 아래에 적힌 한 줄이 맞는지, 아니면 다르게 말씀해 주실래요?`,
      ].join("\n\n"),
      guide,
    );
  }
  return askWithGuide(
    [
      STAGE1_CUSTOMER_PROBLEM_RATIONALE,
      `${prefix}그럼 첫으로, 문제점을 같이 잡아볼게요. 어떤 고객·상황의 어떤 문제에서 시작할지, 한두 문장이면 충분해요.`,
    ].join("\n\n"),
    guide,
  );
}

export function getCollectInputGuideForStep(
  step: Stage1CollectStep,
  hasStartingHint?: boolean,
): CoachInputGuide | undefined {
  if (step === "team_invite" || step === "hopes_gate") return undefined;
  return getStage1CollectInputGuide(step, hasStartingHint);
}

/** 팀·프로젝트 이름 정리 후 Hopes·Fears 진입 전 안내 */
export const HOPES_GATE_COACH_REPLY = formatCoachDialogBreaks(
  [
    "프로젝트 이름과 진행 방식을 정리했어요.",
    "이제 Hopes·Fears를 함께 맞춰 볼 차례예요.",
    "준비되시면 아래 「다음으로 진행하기」를 눌러 주세요.",
  ].join("\n\n"),
);

export function hopesStepCoachReply(): string {
  return askWithGuide(
    "고마워요. 출발 문제를 잡았으니, 이제 그다음 단계로 갈 준비가 됐어요.\n\n이번 과정에서 얻고 싶은 것 — Hopes — 은 무엇인가요?",
    getStage1CollectInputGuide("hopes"),
  );
}

export function advanceStage1Collect(
  step: Stage1CollectStep,
  userText: string,
  context?: { startingPoint?: string; displayName?: string },
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
    case "starting_point":
      return {
        patch: { startingPoint: text },
        nextStep: "project_name",
        coachReply: firstProjectNameCoachMessage(text),
      };
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
      return {
        patch: { projectTitle },
        nextStep: "team_collaboration",
        coachReply: askWithGuide(
          [
            `고마워요. 프로젝트 이름은 「${projectTitle}」로 맞춰 둘게요.`,
            TEAM_COLLABORATION_QUESTION,
          ].join("\n\n"),
          getStage1CollectInputGuide("team_collaboration"),
        ),
      };
    }
    case "team_collaboration": {
      const choice = parseTeamCollaborationChoice(text);
      if (choice === "no") {
        return {
          patch: { teamWantsCollaboration: false },
          nextStep: "hopes_gate",
          coachReply: HOPES_GATE_COACH_REPLY,
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
    case "hopes_gate":
      return {
        patch: {},
        nextStep: "hopes_gate",
        coachReply: formatCoachDialogBreaks(
          "아래 「다음으로 진행하기」를 누르면 Hopes·Fears 단계로 이어갈게요.",
        ),
      };
    case "hopes":
      return {
        patch: { hope: text },
        nextStep: "fears",
        coachReply: askWithGuide(
          "이해했어요.\n\n그럼 걱정되는 것 — Fears — 은 무엇인가요?",
          getStage1CollectInputGuide("fears"),
        ),
      };
    case "fears":
      return {
        patch: { fear: text, principleAck: true },
        nextStep: "done",
        coachReply: formatCoachDialogBreaks(
          [
            "이해했어요. 원칙 하나만 짚고 넘어갈게요.",
            `「${STAGE1_PRINCIPLE.match}」 — ${STAGE1_PRINCIPLE.text}`,
            "좋아요. 문제점·Hopes·Fears를 모두 들었어요.",
            "아래 「다음으로 이동」을 누르면 왼쪽 검토 화면으로 이어갈게요.",
          ].join("\n\n"),
        ),
      };
    case "principle":
      return {
        patch: { principleAck: true },
        nextStep: "done",
        coachReply: formatCoachDialogBreaks(
          [
            "좋아요. 문제점·Hopes·Fears를 모두 들었어요.",
            "아래 「다음으로 이동」을 누르면 왼쪽 검토 화면으로 이어갈게요.",
          ].join("\n\n"),
        ),
      };
  }
}

/** 「다음으로 진행하기」 — Hopes·Fears 대화 시작 */
export function advanceToHopesAndFears(): {
  patch: Partial<Stage1CollectedData>;
  nextStep: Stage1CollectStep;
  coachReply: string;
} {
  return {
    patch: {},
    nextStep: "hopes",
    coachReply: hopesStepCoachReply(),
  };
}

/** 초대 UI · Hopes 단계로 진행 */
export function advanceFromTeamInvite(): {
  patch: Partial<Stage1CollectedData>;
  nextStep: Stage1CollectStep;
  coachReply: string;
} {
  const next = advanceToHopesAndFears();
  return {
    patch: { teamWantsCollaboration: true },
    nextStep: next.nextStep,
    coachReply: next.coachReply,
  };
}
