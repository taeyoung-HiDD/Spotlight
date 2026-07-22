"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { useMemo } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { getStageConfig } from "@/config/stageConfig";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import type { Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";

function summarizeHmw(data: Stage7HmwData): string {
  const filled = data.questions.filter((q) => q.hmwText.trim()).length;
  const total = data.questions.length;
  return `HMW 질문 ${filled}/${total}개 작성 · 잠재 니즈 ${total}개 연결`;
}

interface HmwCoachPanelProps {
  projectId: string;
  data: Stage7HmwData;
  variant: "intro" | "work";
}

export function HmwCoachPanel({ projectId, data, variant }: HmwCoachPanelProps) {
  const stageConfig = getStageConfig(7);
  const locale = useUiLocale();
  const purpose = getStagePurposeCopy(7, locale);

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
          "6단계에서 정리한 잠재 니즈를 하나씩 HMW 질문으로 바꿔 보세요. 아직 답이나 솔루션이 아니라, ‘어떻게 하면 …하기 위해 …할 수 있을까?’처럼 목적과 구체 상태를 함께 담은 열린 질문이면 충분해요.",
        ),
      },
    ];
  }, [purpose]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 7,
      stageTitle: "HMW 질문 만들기",
      artifactSummary: summarizeHmw(data),
      stageBehaviorNote:
        "7단계 HMW: 잠재 니즈를 「어떻게 하면 ~하기 위해 ~할 수 있을까?」 형태로 바꿉니다. 목적·제약(왜)과 구체 상태(무엇을)를 함께 담아, 다음 아이디어 단계에서 솔루션을 떠올릴 수 있게 합니다. 단순 「어떻게 하면 ~할 수 있을까?」는 피합니다.",
    }),
    [projectId, data],
  );

  if (variant === "intro") {
    return (
      <AnimatedCoachPanel
        sceneKey={`stage-7-hmw-${projectId}-intro`}
        statusLabel={stageConfig.introStatusLabel ?? "짚어주는 중"}
        statusSub="HMW 질문 만들기"
        messages={introMessages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={`stage-7-hmw-work-${projectId}`}
      statusLabel="짚어주는 중"
      statusSub="HMW 질문 만들기"
      messages={introMessages}
      chatContext={chatContext}
      inputGuide={getStageWorkInputGuide(7, locale)}
      showComposer
    />
  );
}
