"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { StageTwoColumnLayout } from "@/components/stage/StageTwoColumnLayout";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import {
  getInitialInteractionMode,
  getStageConfig,
  type InteractionMode,
} from "@/config/stageConfig";
import { StageIntroGateProvider } from "@/components/layout/StageIntroGate";
import { useWorkspaceScrollOnEnter } from "@/lib/motion/pageEnterScroll";
import {
  stageCoachBtnPrimary,
  stageCoachCaption,
  stageIntroEnterWork,
  stageIntroShell,
} from "@/lib/stages/ui";

interface StageContainerProps {
  stageNumber: number;
  /** 단계·프로젝트별 코치 scene key */
  sceneKey: string;
  work: ReactNode;
  /** work 모드 우측 코치 */
  coach: ReactNode;
  /** intro 모드 중앙 코치 (없으면 coach 사용) */
  introCoach?: ReactNode;
  /** 인트로 발화 종료 후 작업 분할 화면 진입 */
  onEnterWork?: () => void;
}

/**
 * 단계 마스터 프레임 — isConversationalInput에 따라 intro / work 모드 분기.
 * - 대화형: 중앙 인트로 → CTA 후 좌우 분할
 * - 직접 작업형: 진입 즉시 좌우 분할 (인트로 생략)
 */
export function StageContainer({
  stageNumber,
  sceneKey,
  work,
  coach,
  introCoach,
  onEnterWork,
}: StageContainerProps) {
  const config = getStageConfig(stageNumber);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() =>
    getInitialInteractionMode(stageNumber),
  );
  const [introDialogDone, setIntroDialogDone] = useState(false);

  useEffect(() => {
    setInteractionMode(getInitialInteractionMode(stageNumber));
    setIntroDialogDone(false);
  }, [stageNumber, sceneKey]);

  const enterWork = useCallback(() => {
    setInteractionMode("work");
    onEnterWork?.();
  }, [onEnterWork]);

  useWorkspaceScrollOnEnter(`${stageNumber}-${interactionMode}`);

  if (!config.isConversationalInput || interactionMode === "work") {
    return (
      <StageRevealGroup>
        <div key="work" className="coach-page-enter">
          <StageTwoColumnLayout work={work} coach={coach} />
        </div>
      </StageRevealGroup>
    );
  }

  const coachIntro = introCoach ?? coach;

  return (
    <StageRevealGroup>
      <div key="intro" className="coach-page-enter">
      <StageIntroGateProvider onIntroComplete={() => setIntroDialogDone(true)}>
        <div className={stageIntroShell} data-stage-intro={stageNumber}>
          <div className={stageIntroEnterWork}>{coachIntro}</div>
          {introDialogDone ? (
            <div className="mt-5 flex flex-col items-center gap-2 border-t border-border-warm pt-5">
              <p className={`text-center break-keep ${stageCoachCaption}`}>
                이 단계에서 무엇을 할지 이해하셨다면, 왼쪽 작업 영역과 함께
                정리해 볼게요.
              </p>
              <button
                type="button"
                onClick={enterWork}
                className={`${stageCoachBtnPrimary} w-full max-w-sm sm:w-auto`}
              >
                함께 정리하기 →
              </button>
            </div>
          ) : null}
        </div>
      </StageIntroGateProvider>
      </div>
    </StageRevealGroup>
  );
}
