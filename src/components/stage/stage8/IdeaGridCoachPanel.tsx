"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { useMemo } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { getStageConfig } from "@/config/stageConfig";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import {
  filledIdeaCount,
  type IdeaGridData,
} from "@/lib/stages/stage8/ideaGridTypes";
import type { HmwQuestion } from "@/lib/stages/stage7/hmwTypes";

interface IdeaGridCoachPanelProps {
  projectId: string;
  data: IdeaGridData;
  hmwQuestions: HmwQuestion[];
  variant: "intro" | "work";
}

export function IdeaGridCoachPanel({
  projectId,
  data,
  hmwQuestions,
  variant,
}: IdeaGridCoachPanelProps) {
  const stageConfig = getStageConfig(8);
  const locale = useUiLocale();
  const purpose = getStagePurposeCopy(8, locale);

  const hmwSnippet = hmwQuestions.find((q) => q.hmwText.trim())?.hmwText.trim();

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
          hmwSnippet
            ? `7단계 HMW 질문을 출발점으로 아이디어를 quantity-first로 펼쳐 보세요.\n\n예: 「${hmwSnippet.slice(0, 48)}${hmwSnippet.length > 48 ? "…" : ""}」`
            : "HMW 질문을 바탕으로 해결 아이디어를 quantity-first로 펼쳐 보세요. 먼저 양으로, 평가는 나중에.",
        ),
      },
      {
        type: "bubble",
        variant: "secondary",
        content: formatCoachDialogBreaks(
          "9칸을 다 채우지 않아도 괜찮아요. 막히면 SCAMPER 보강 도구로 같은 아이디어를 비틀어 볼 수 있어요.",
        ),
      },
    ];
  }, [purpose, hmwSnippet]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 8,
      stageTitle: "아이디어 펼치기",
      artifactSummary: `아이디어 ${filledIdeaCount(data)}/9 · HMW ${hmwQuestions.filter((q) => q.hmwText.trim()).length}개 연결`,
      stageBehaviorNote:
        "8단계 아이디어 펼치기: HMW 질문에서 9칸 그리드·스케치·SCAMPER로 아이디어를 quantity-first로 펼칩니다.",
    }),
    [projectId, data, hmwQuestions],
  );

  if (variant === "intro") {
    return (
      <AnimatedCoachPanel
        sceneKey={`stage-8-ideation-${projectId}-intro`}
        statusLabel={stageConfig.introStatusLabel ?? "함께 펼치는 중"}
        statusSub="아이디어 펼치기"
        messages={introMessages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={`stage-8-ideation-work-${projectId}`}
      statusLabel="함께 펼치는 중"
      statusSub="아이디어 펼치기"
      messages={introMessages}
      chatContext={chatContext}
      inputGuide={getStageWorkInputGuide(8, locale)}
      showComposer
    />
  );
}
