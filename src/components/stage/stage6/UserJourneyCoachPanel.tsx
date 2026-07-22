"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { useMemo } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { getStageConfig } from "@/config/stageConfig";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { allStepItemIds } from "@/lib/stages/stage6/journeyStepZones";
import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";

function summarizeJourney(data: UserJourneyMapData): string {
  return data.subjects
    .map((subject, idx) => {
      const persona = data.personas[subject.id];
      if (!persona) return "";
      const assigned = persona.steps.reduce(
        (sum, step) => sum + allStepItemIds(step, data.itemsById).length,
        0,
      );
      const pool = persona.poolItemIds.length;
      const label = subject.name.trim() || `페르소나 ${idx + 1}`;
      return `${label}: 배치 ${assigned}개 · 풀 ${pool}개`;
    })
    .filter(Boolean)
    .join("\n");
}

interface UserJourneyCoachPanelProps {
  projectId: string;
  data: UserJourneyMapData;
  variant: "intro" | "work";
}

export function UserJourneyCoachPanel({
  projectId,
  data,
  variant,
}: UserJourneyCoachPanelProps) {
  const stageConfig = getStageConfig(5);
  const locale = useUiLocale();
  const purpose = getStagePurposeCopy(5, locale);

  const introMessages = useMemo((): CoachDialogItem[] => {
    return [
      {
        type: "highlight",
        label: purpose.label,
        content: formatCoachDialogBreaks(purpose.purpose),
      },
      {
        type: "bubble",
        content: formatCoachDialogBreaks(
          "페르소나 탭을 바꿔 가며 각 조사 대상의 여정을 확인해 보세요. 4단계 언급·관찰이 들어오면 단계에 초안으로 올라가 있어요. 어색한 칸만 드래그로 옮겨 보세요.",
        ),
      },
    ];
  }, [purpose]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 5,
      stageTitle: "사용자 여정 지도 그리기",
      artifactSummary: summarizeJourney(data),
      stageBehaviorNote:
        "5단계 User Journey Map: 페르소나별로 언급·관찰이 여정 단계에 초안 배치됩니다. 잠재 니즈는 다음 단계에서 다룹니다. 사용자는 위치를 다듬으며 인사이트가 몰린 구간을 확인합니다.",
    }),
    [projectId, data],
  );

  if (variant === "intro") {
    return (
      <AnimatedCoachPanel
        sceneKey={`stage-6-journey-${projectId}-intro`}
        statusLabel={stageConfig.introStatusLabel ?? "짚어주는 중"}
        statusSub="사용자 여정 지도 그리기"
        messages={introMessages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={`stage-6-journey-work-${projectId}`}
      statusLabel="짚어주는 중"
      statusSub="사용자 여정 지도 그리기"
      messages={introMessages}
      chatContext={chatContext}
      inputGuide={getStageWorkInputGuide(6, locale)}
      showComposer
    />
  );
}
