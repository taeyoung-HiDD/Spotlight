"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { StageWorkDiscoveryPlaceholder } from "@/components/stage/StageWorkDiscoveryPlaceholder";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { getStageConfig } from "@/config/stageConfig";
import { introMessagesToCoachDialog } from "@/lib/coach/renderIntroMessages";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { STAGE_COUNT, STAGE_META } from "@/lib/stages/constants";
import {
  stageCaption,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface StageDiscoveryShellProps {
  projectId: string;
  stageNumber: number;
}

/**
 * UI 미구현 단계 — 코치 목적 설명 + 좌측 discovery placeholder 골격.
 * 본격 작업 패널은 단계별 구현 시 discovery flow와 함께 교체합니다.
 */
export function StageDiscoveryShell({
  projectId,
  stageNumber,
}: StageDiscoveryShellProps) {
  const router = useRouter();
  const config = getStageConfig(stageNumber);
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(stageNumber, locale);
  const meta = STAGE_META[stageNumber];
  const sceneKey = `stage-${stageNumber}-shell-${projectId}`;

  const introFromConfig = useMemo(
    () =>
      config.introMessages?.length
        ? introMessagesToCoachDialog(config.introMessages)
        : null,
    [config.introMessages],
  );

  const fallbackIntro = useMemo((): CoachDialogItem[] => {
    const title = meta?.title ?? `단계 ${stageNumber}`;
    return [
      {
        type: "highlight",
        label: purposeCopy.label,
        content: purposeCopy.purpose,
      },
      {
        type: "bubble",
        content: `${title} 화면은 준비 중이에요. 지금은 Kevin과 목적·진행 방식만 맞춰 두고, 작업 패널은 곧 연결될 예정이에요.`,
      },
    ];
  }, [meta?.title, purposeCopy, stageNumber]);

  const introMessages = introFromConfig ?? fallbackIntro;

  const coachPanel = (
    <AnimatedCoachPanel
      sceneKey={sceneKey}
      statusLabel={config.workStatusLabel ?? "듣는 중"}
      statusSub={config.workStatusSub ?? meta?.title ?? "작업"}
      messages={introMessages}
      showComposer={false}
    />
  );

  const workPanel = (
    <>
      <section className={stagePanel}>
        <h2 className={stageSectionTitle}>
          {meta?.title ?? `단계 ${stageNumber}`}
        </h2>
        <p className={`mt-1 mb-4 ${stageSectionLead}`}>
          {purposeCopy.workCaption} — UI 구현 전 단계예요.
        </p>
        <StageWorkDiscoveryPlaceholder caption={purposeCopy.workCaption}>
          {purposeCopy.placeholderLines[0]}
          <br />
          {purposeCopy.placeholderLines[1]}
        </StageWorkDiscoveryPlaceholder>
      </section>
      <div
        className={`${stagePanel} mt-4 flex flex-wrap items-center justify-between gap-3`}
      >
        <p className={stageCaption}>
          이전·다음 단계로 이동할 수 있어요. 작업 패널은 곧 연결될 예정이에요.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {stageNumber > 1 ? (
            <WorkspaceBackButton
              projectId={projectId}
              fallbackStageId={stageNumber - 1}
            />
          ) : null}
          {stageNumber < STAGE_COUNT ? (
            <WorkspaceForwardButton
              stageId={stageNumber + 1}
              onClick={() =>
                router.push(`/project/${projectId}/stage/${stageNumber + 1}`)
              }
            />
          ) : null}
        </div>
      </div>
    </>
  );

  if (config.isConversationalInput) {
    return (
      <StageContainer
        stageNumber={stageNumber}
        sceneKey={sceneKey}
        introCoach={coachPanel}
        coach={coachPanel}
        work={workPanel}
      />
    );
  }

  return (
    <StageContainer
      stageNumber={stageNumber}
      sceneKey={sceneKey}
      coach={coachPanel}
      work={workPanel}
    />
  );
}
