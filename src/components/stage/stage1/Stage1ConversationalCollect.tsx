"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { StageContinueGatePanel } from "@/components/stage/StageContinueGatePanel";
import { Stage1HopesGatePanel } from "@/components/stage/stage1/Stage1HopesGatePanel";
import { Stage1TeamInvitePanel } from "@/components/stage/stage1/Stage1TeamInvitePanel";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import {
  fetchStage1CollectState,
  saveStage1CollectState,
  type Stage1PersistedState,
} from "@/lib/artifacts/stage1Collect";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import {
  advanceFromTeamInvite,
  advanceStage1Collect,
  advanceToHopesAndFears,
  firstProjectNameCoachMessage,
  getCollectInputGuideForStep,
  type Stage1CollectedData,
  type Stage1CollectStep,
} from "@/lib/stages/stage1/collectFlow";
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";
import { stageCoachComposerShell, stageIntroEnterWork, stageIntroShell } from "@/lib/stages/ui";

const KICKOFF_MESSAGES: CoachDialogItem[] = [
  {
    type: "bubble",
    content: formatCoachDialogBreaks(
      `이제 프로젝트 이름을 정하고, 팀 여부와 Hopes · Fears를 대화로 받을게요.`,
    ),
  },
];

interface Stage1ConversationalCollectProps {
  projectId: string;
  startingPoint: string;
  initialProjectTitle?: string;
  displayName?: string;
  userLevel?: "beginner" | "expert";
  /** 팀원 · Hopes부터 합류 */
  isInviteMember?: boolean;
  persistedState?: Stage1PersistedState | null;
  onComplete: (data: Stage1CollectedData) => void;
  /** 프로젝트 이름 단계 저장 시 GNB 제목 동기화 */
  onProjectTitleChange?: (title: string) => void;
}

function toCollected(
  state: Stage1PersistedState,
  displayName?: string,
  userLevel?: UserCoachingLevel,
): Stage1CollectedData {
  return {
    displayName: displayName ?? state.displayName,
    userLevel: userLevel ?? state.userLevel,
    startingPoint: state.startingPoint,
    projectTitle: state.projectTitle,
    teamWantsCollaboration: state.teamWantsCollaboration,
    hope: state.hope,
    fear: state.fear,
    principleAck: state.principleAck,
  };
}

function memberEntryStep(state: Stage1PersistedState): Stage1CollectStep {
  if (state.hope.trim()) return state.fear.trim() ? "principle" : "fears";
  if (state.fear.trim()) return "principle";
  if (state.collectStep === "fears" || state.collectStep === "principle") {
    return state.collectStep;
  }
  return "hopes_gate";
}

function normalizeRestoredCollectStep(
  saved: Stage1CollectStep,
  state: Stage1PersistedState,
): Stage1CollectStep {
  if (saved === "hopes" && !state.hope.trim()) return "hopes_gate";
  return saved;
}

/** 단계 1 · 중앙 코치 대화로 슬롯 수집 */
export function Stage1ConversationalCollect({
  projectId,
  startingPoint: startingPointProp,
  initialProjectTitle = "",
  displayName,
  userLevel,
  isInviteMember = false,
  persistedState,
  onComplete,
  onProjectTitleChange,
}: Stage1ConversationalCollectProps) {
  const sceneKey = `stage-1-collect-${projectId}`;

  const initialStep: Stage1CollectStep = isInviteMember
    ? memberEntryStep(
        persistedState ?? {
          startingPoint: startingPointProp,
          projectTitle: initialProjectTitle,
          teamWantsCollaboration: null,
          collectStep: "hopes",
          hope: "",
          fear: "",
          principleAck: false,
        },
      )
    : (persistedState?.collectStep ?? "project_name");

  const [step, setStep] = useState<Stage1CollectStep>(initialStep);
  const [inputGuide, setInputGuide] = useState<CoachInputGuide | undefined>(() =>
    getCollectInputGuideForStep(initialStep),
  );
  const [data, setData] = useState<Stage1CollectedData>(() => ({
    startingPoint:
      persistedState?.startingPoint?.trim() || startingPointProp.trim(),
    projectTitle:
      persistedState?.projectTitle?.trim() || initialProjectTitle.trim(),
    teamWantsCollaboration: persistedState?.teamWantsCollaboration ?? null,
    hope: persistedState?.hope ?? "",
    fear: persistedState?.fear ?? "",
    principleAck: persistedState?.principleAck ?? false,
    displayName,
    userLevel,
  }));
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [seededKickoff, setSeededKickoff] = useState(false);
  const [collectDone, setCollectDone] = useState(false);
  const [pendingComplete, setPendingComplete] = useState<Stage1CollectedData | null>(
    null,
  );
  const [liveCoachLines, setLiveCoachLines] = useState<CoachDialogItem[]>([]);

  const kickoffWithQuestion = useMemo((): CoachDialogItem[] => {
    if (isInviteMember) {
      return [
        {
          type: "bubble",
          content: formatCoachDialogBreaks(
            [
              displayName?.trim()
                ? `${displayName.trim()}님, 프로젝트에 합류하신 걸 환영해요.`
                : "프로젝트에 합류하신 걸 환영해요.",
              data.projectTitle.trim()
                ? `프로젝트 「${data.projectTitle.trim()}」에 합류하신 거예요.`
                : `문제점은 이미 정해져 있어요: 「${data.startingPoint}」`,
              "준비되시면 아래 「다음으로 진행하기」로 Hopes·Fears 대화를 시작해요.",
            ].join("\n\n"),
          ),
        },
      ];
    }
    return [
      ...KICKOFF_MESSAGES,
      {
        type: "bubble",
        variant: "secondary",
        content: firstProjectNameCoachMessage(
          data.startingPoint,
          displayName,
        ),
      },
    ];
  }, [data.startingPoint, displayName, isInviteMember]);

  const persist = useCallback(
    async (next: Stage1CollectedData, nextStep: Stage1CollectStep) => {
      const state: Stage1PersistedState = {
        startingPoint: next.startingPoint,
        projectTitle: next.projectTitle,
        teamWantsCollaboration: next.teamWantsCollaboration,
        collectStep: nextStep,
        displayName: next.displayName,
        userLevel: next.userLevel,
        hope: next.hope,
        fear: next.fear,
        principleAck: next.principleAck,
      };
      const id = await saveStage1CollectState(projectId, state, artifactId);
      setArtifactId(id);
    },
    [artifactId, projectId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { artifactId: aid, state } = await fetchStage1CollectState(projectId);
        if (cancelled) return;
        setArtifactId(aid);
        if (
          state.startingPoint ||
          state.projectTitle ||
          state.collectStep !== "starting_point"
        ) {
          setData((prev) => ({
            ...prev,
            ...toCollected(state, displayName, userLevel),
          }));
          const restoredStep = normalizeRestoredCollectStep(
            state.collectStep,
            state,
          );
          setStep(restoredStep);
          setInputGuide(getCollectInputGuideForStep(restoredStep));
        }
      } catch {
        /* 로컬 상태로 진행 */
      } finally {
        if (!cancelled) setSeededKickoff(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, displayName, userLevel, isInviteMember]);

  const applyAdvance = useCallback(
    (
      patch: Partial<Stage1CollectedData>,
      nextStep: Stage1CollectStep | "done",
      coachReply: string,
    ) => {
      if (nextStep === "done") {
        setCollectDone(true);
        let mergedForComplete: Stage1CollectedData | null = null;
        setData((prev) => {
          const merged = {
            ...prev,
            ...patch,
            principleAck: true,
            displayName,
            userLevel,
          };
          void persist(merged, "principle");
          mergedForComplete = merged;
          return merged;
        });
        if (mergedForComplete) {
          setPendingComplete(mergedForComplete);
        }
        return coachReply;
      }

      const titleToSync = patch.projectTitle?.trim();
      if (titleToSync) {
        onProjectTitleChange?.(titleToSync);
      }

      setData((prev) => {
        const merged = { ...prev, ...patch, displayName, userLevel };
        void persist(merged, nextStep);
        return merged;
      });
      setStep(nextStep);
      setInputGuide(getCollectInputGuideForStep(nextStep));

      return coachReply;
    },
    [displayName, userLevel, onProjectTitleChange, persist],
  );

  const handleCoachMessage = useCallback(
    async (message: string): Promise<string> => {
      if (collectDone) return "";

      const { patch, nextStep, coachReply } = advanceStage1Collect(
        step,
        message.trim(),
        {
          startingPoint: data.startingPoint || startingPointProp,
          displayName,
        },
      );

      return applyAdvance(patch, nextStep, coachReply);
    },
    [step, collectDone, applyAdvance, data.startingPoint, startingPointProp, displayName],
  );

  const appendCoachLine = useCallback((coachReply: string) => {
    if (!coachReply.trim()) return;
    setLiveCoachLines((lines) => [
      ...lines,
      { type: "bubble", content: coachReply },
    ]);
  }, []);

  const handleProceedToHopes = useCallback(() => {
    const { patch, nextStep, coachReply } = advanceToHopesAndFears();
    appendCoachLine(coachReply);
    applyAdvance(patch, nextStep, "");
  }, [appendCoachLine, applyAdvance]);

  const handleInviteContinue = useCallback(() => {
    const { patch, nextStep, coachReply } = advanceFromTeamInvite();
    appendCoachLine(coachReply);
    applyAdvance(patch, nextStep, "");
  }, [appendCoachLine, applyAdvance]);

  const handleReviewContinue = useCallback(() => {
    if (!pendingComplete) return;
    onComplete(pendingComplete);
  }, [onComplete, pendingComplete]);

  if (!seededKickoff) return null;

  const showComposer =
    !collectDone &&
    step !== "team_invite" &&
    step !== "hopes_gate" &&
    step !== "principle";

  return (
    <StageRevealGroup>
      <div className={stageIntroShell} data-stage-collect="1">
        <div className={stageIntroEnterWork}>
          <AnimatedCoachPanel
            sceneKey={sceneKey}
            statusLabel="듣는 중"
            statusSub={
              isInviteMember
                ? "팀 합류 · Hopes · Fears"
                : "프로젝트 이름 · 팀 · Hopes · Fears"
            }
            messages={kickoffWithQuestion}
            staticCoachLines={liveCoachLines}
            onCoachMessage={handleCoachMessage}
            inputGuide={collectDone ? undefined : inputGuide}
            showComposer={showComposer}
            composerResetKey={step}
            footer={
              collectDone && pendingComplete ? (
                <div className={stageCoachComposerShell}>
                  <StageContinueGatePanel
                    caption="대화로 모은 내용을 바탕으로 왼쪽 검토 화면에서 정리해 볼게요."
                    onContinue={handleReviewContinue}
                  />
                </div>
              ) : null
            }
          />
          {step === "team_invite" && !collectDone ? (
            <div className={stageCoachComposerShell}>
              <Stage1TeamInvitePanel
                projectId={projectId}
                onContinue={handleInviteContinue}
                disabled={collectDone}
              />
            </div>
          ) : null}
          {step === "hopes_gate" && !collectDone ? (
            <div className={stageCoachComposerShell}>
              <Stage1HopesGatePanel
                onContinue={handleProceedToHopes}
                disabled={collectDone}
              />
            </div>
          ) : null}
        </div>
      </div>
    </StageRevealGroup>
  );
}
