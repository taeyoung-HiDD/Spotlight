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
          "앞 단계 HMW마다 칸이 생겨요. 핵심 니즈 기준으로 먼저 펼치고, 더 필요하면 「다음 사분면에서 HMW 더 가져오기」로 칸을 늘릴 수 있어요. 막히면 「다른 관점이 필요해요」로 SCAMPER·원리 카드·팀 관점을 받아 보세요. 칸을 비우면 아이디어 은행에 보류됩니다.",
        ),
      },
    ];
  }, [purpose, hmwSnippet]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 8,
      stageTitle: "아이디어 펼치기",
      artifactSummary: `아이디어 ${filledIdeaCount(data)}/${data.slots.length} · HMW ${hmwQuestions.filter((q) => q.hmwText.trim()).length}개 연결`,
      stageBehaviorNote:
        "8단계 아이디어 펼치기: 핵심 니즈 기반 HMW로 칸을 채우고 quantity-first로 아이디어를 펼칩니다. 막히면 SCAMPER·원리 카드·팀 관점 자극을 쓰고, 칸을 비우면 아이디어 은행에 보류합니다. 더 필요하면 다음 사분면 니즈로 HMW를 추가할 수 있습니다. AI 스케치는 참고 사례일 뿐 사용자 스케치를 덮지 않습니다.",
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
