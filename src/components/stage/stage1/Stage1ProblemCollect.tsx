"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { StageContinueGatePanel } from "@/components/stage/StageContinueGatePanel";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import {
  DEFAULT_STAGE1_STATE,
  saveStage1CollectState,
} from "@/lib/artifacts/stage1Collect";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStage1CollectInputGuide } from "@/lib/coach/inputGuidance";
import {
  advanceProblemCapture,
  firstProblemCaptureCoachMessage,
} from "@/lib/stages/stage1/collectFlow";
import { STAGE1_CUSTOMER_PROBLEM_RATIONALE_BRIEF } from "@/lib/stages/stage1/customerProblemRationale";
import {
  stageCoachComposerShell,
  stageIntroEnterWork,
  stageIntroShell,
} from "@/lib/stages/ui";

const KICKOFF: CoachDialogItem[] = [
  {
    type: "bubble",
    content: formatCoachDialogBreaks(
      `먼저 출발할 문제점부터 잡을게요.\n\n${STAGE1_CUSTOMER_PROBLEM_RATIONALE_BRIEF}`,
    ),
  },
];

interface Stage1ProblemCollectProps {
  projectId: string;
  onComplete: (startingPoint: string) => void;
}

/** 단계 1 · 온보딩(이름) 전 출발 문제점 수집 */
export function Stage1ProblemCollect({
  projectId,
  onComplete,
}: Stage1ProblemCollectProps) {
  const sceneKey = `stage-1-problem-${projectId}`;
  const [inputGuide] = useState<CoachInputGuide>(() =>
    getStage1CollectInputGuide("starting_point"),
  );
  const [seeded, setSeeded] = useState(false);
  const [done, setDone] = useState(false);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [pendingStartingPoint, setPendingStartingPoint] = useState<string | null>(
    null,
  );

  const kickoffMessages = useMemo((): CoachDialogItem[] => {
    return [
      ...KICKOFF,
      {
        type: "bubble",
        variant: "secondary",
        content: firstProblemCaptureCoachMessage(),
      },
    ];
  }, []);

  useEffect(() => {
    setSeeded(true);
  }, [sceneKey]);

  const handleCoachMessage = useCallback(
    async (message: string): Promise<string> => {
      if (done) return "";

      const { patch, coachReply } = advanceProblemCapture(message.trim());
      const startingPoint = patch.startingPoint?.trim();
      if (!startingPoint) return coachReply;

      const state = {
        ...DEFAULT_STAGE1_STATE,
        startingPoint,
        collectStep: "project_name" as const,
      };
      const id = await saveStage1CollectState(projectId, state, artifactId);
      setArtifactId(id);
      setDone(true);
      setPendingStartingPoint(startingPoint);
      return coachReply;
    },
    [artifactId, done, projectId],
  );

  const handleContinue = useCallback(() => {
    if (!pendingStartingPoint) return;
    onComplete(pendingStartingPoint);
  }, [onComplete, pendingStartingPoint]);

  if (!seeded) return null;

  return (
    <StageRevealGroup>
      <div className={stageIntroShell} data-stage-problem="1">
        <div className={stageIntroEnterWork}>
          <AnimatedCoachPanel
            sceneKey={sceneKey}
            statusLabel="듣는 중"
            statusSub="출발 문제점"
            messages={kickoffMessages}
            onCoachMessage={handleCoachMessage}
            inputGuide={done ? undefined : inputGuide}
            showComposer={!done}
            composerResetKey="problem"
            footer={
              done && pendingStartingPoint ? (
                <div className={stageCoachComposerShell}>
                  <StageContinueGatePanel
                    caption="출발 문제점을 정리했어요. 코칭 맞춤 질문으로 이어갈게요."
                    onContinue={handleContinue}
                  />
                </div>
              ) : null
            }
          />
        </div>
      </div>
    </StageRevealGroup>
  );
}
