"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { StageContinueGatePanel } from "@/components/stage/StageContinueGatePanel";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import {
  advanceOnboarding,
  diagnosticKickoffCoachMessage,
  diagnosticKickoffCoachMessageAfterProblem,
  getOnboardingInputGuide,
  type OnboardingStep,
  type Stage1OnboardingDraft,
  type Stage1OnboardingResult,
} from "@/lib/stages/stage1/onboardingFlow";
import { stageCoachComposerShell, stageIntroEnterWork, stageIntroShell } from "@/lib/stages/ui";

interface Stage1OnboardingCollectProps {
  projectId: string;
  /** 회원가입 시 저장된 이름 — 코치 호칭에 사용 */
  displayName: string;
  /** true면 출발 문제점 직후 — 「처음 오신 분」 환영 생략 */
  afterProblemCapture?: boolean;
  onComplete: (result: Stage1OnboardingResult) => void;
}

/** 단계 1 · 3질문 수준 진단 (대화) */
export function Stage1OnboardingCollect({
  projectId,
  displayName,
  afterProblemCapture = false,
  onComplete,
}: Stage1OnboardingCollectProps) {
  const sceneKey = `stage-1-onboarding-${projectId}`;
  const [step, setStep] = useState<OnboardingStep>("diagnostic_dt_flow");
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [pendingResult, setPendingResult] = useState<Stage1OnboardingResult | null>(
    null,
  );
  const [inputGuide, setInputGuide] = useState<CoachInputGuide>(() =>
    getOnboardingInputGuide("diagnostic_dt_flow"),
  );
  const [draft, setDraft] = useState<Stage1OnboardingDraft>({
    displayName,
    answers: {},
    scores: [],
    skippedDiagnostic: false,
  });
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    setDraft((prev) => ({ ...prev, displayName }));
  }, [displayName]);

  const kickoffMessages = useMemo((): CoachDialogItem[] => {
    const content = afterProblemCapture
      ? diagnosticKickoffCoachMessageAfterProblem(displayName)
      : diagnosticKickoffCoachMessage(displayName);
    return [
      {
        type: "bubble",
        variant: "secondary",
        content,
      },
    ];
  }, [afterProblemCapture, displayName]);

  const handleCoachMessage = useCallback(
    async (message: string): Promise<string> => {
      const {
        patch,
        nextStep,
        coachReply,
        result,
      } = await advanceOnboarding(step, message, draft);

      setDraft((prev) => ({
        displayName: patch.displayName ?? prev.displayName,
        answers: patch.answers ?? prev.answers,
        scores: patch.scores ?? prev.scores,
        skippedDiagnostic: patch.skippedDiagnostic ?? prev.skippedDiagnostic,
      }));

      if (result && nextStep === "done") {
        setPendingResult(result);
        setOnboardingDone(true);
        return coachReply;
      }

      if (nextStep !== "done") {
        setStep(nextStep);
        setInputGuide(getOnboardingInputGuide(nextStep));
      }
      return coachReply;
    },
    [step, draft],
  );

  useEffect(() => {
    setSeeded(true);
  }, [sceneKey]);

  const handleContinue = useCallback(() => {
    if (!pendingResult) return;
    onComplete(pendingResult);
  }, [onComplete, pendingResult]);

  if (!seeded) return null;

  return (
    <StageRevealGroup>
      <div className={stageIntroShell} data-stage-onboarding="1">
        <div className={stageIntroEnterWork}>
          <AnimatedCoachPanel
            sceneKey={sceneKey}
            statusLabel={afterProblemCapture ? "듣는 중" : "환영"}
            statusSub="맞춤 코칭"
            messages={kickoffMessages}
            onCoachMessage={handleCoachMessage}
            inputGuide={onboardingDone ? undefined : inputGuide}
            showComposer={!onboardingDone}
            composerResetKey={step}
            footer={
              onboardingDone && pendingResult ? (
                <div className={stageCoachComposerShell}>
                  <StageContinueGatePanel
                    caption="코칭 맞춤을 마쳤어요. 프로젝트 이름·팀·Hopes·Fears 단계로 이어갈게요."
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
