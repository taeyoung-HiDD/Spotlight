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
          "6단계에서 정리한 잠재 니즈를 HMW 질문으로 바꿔 보세요. Kevin이 좋은 점 증폭·불편 해소·반대 탐색 세 갈래로 초안을 만든 뒤, 품질 체크에서 가장 알맞은 하나를 골라 두었어요. 아직 답이 아니라 씨앗이에요 — 판단은 잠시 미루고, 와일드한 수정도 환영해요. 체크에 ⚠️가 있어도 ‘틀렸다’가 아니라, 이렇게 바꾸면 아이디어가 더 나올 수 있다는 힌트예요.",
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
        "7단계 HMW: 잠재 니즈마다 Amp up / Remove bad / Explore opposite 세 변주를 만든 뒤 품질 체크로 하나를 고릅니다. 형식은 「어떻게 하면 ~하기 위해 ~할 수 있을까?」. 목적·제약(왜)과 구체 상태(무엇을)를 담아 다음 아이디어 단계 시드로 씁니다. 판단 유예·와일드 아이디어를 독려하고, 체크 warn은 실패가 아니라 다듬기 힌트입니다.",
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
