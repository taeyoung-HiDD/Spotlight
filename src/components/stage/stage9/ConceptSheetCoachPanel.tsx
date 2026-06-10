"use client";

import { useMemo } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { getStageConfig } from "@/config/stageConfig";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import {
  isConceptSheetReadyForStoryboard,
  type ConceptSheetData,
} from "@/lib/stages/stage9/conceptSheetTypes";

function summarizeConcept(data: ConceptSheetData): string {
  const lines: string[] = [];
  if (data.conceptName.trim()) lines.push(`컨셉: ${data.conceptName.trim()}`);
  if (data.oneLiner.trim()) lines.push(`한 줄: ${data.oneLiner.trim()}`);
  data.features.forEach((f, i) => {
    if (f.trim()) lines.push(`기능 ${i + 1}: ${f.trim()}`);
  });
  if (data.trueNeed.trim()) lines.push(`진짜 동기: ${data.trueNeed.trim()}`);
  const captions = data.storyboardCuts.filter((c) => c.caption.trim()).length;
  const images = data.storyboardCuts.filter((c) => c.imageUrl).length;
  lines.push(`스토리보드 문장 ${captions}컷 · 이미지 ${images}컷`);
  return lines.join("\n");
}

interface ConceptSheetCoachPanelProps {
  projectId: string;
  data: ConceptSheetData;
  variant: "intro" | "work";
}

export function ConceptSheetCoachPanel({
  projectId,
  data,
  variant,
}: ConceptSheetCoachPanelProps) {
  const stageConfig = getStageConfig(9);
  const purpose = getStagePurposeCopy(9);
  const ready = isConceptSheetReadyForStoryboard(data);

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
          "4 필드를 채우면 AI가 5컷 스토리보드 일러스트를 만들어요. 마지막 5번 컷이 체험의 결이라 더 크게 보여요. 이미지는 가설 상태로 표시됩니다.",
        ),
      },
    ];
  }, [purpose]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 9,
      stageTitle: "컨셉 정리하기",
      artifactSummary: summarizeConcept(data),
      stageBehaviorNote:
        "9단계 컨셉 시트: 이름·한 줄·기능 3종·진짜 동기를 정리한 뒤 스토리보드 5컷을 생성합니다.",
    }),
    [projectId, data],
  );

  const workHint = ready
    ? "4 필드가 채워졌어요. 스토리보드 문장을 다듬고 「AI 스토리보드 생성」을 눌러 보세요."
    : "빈 칸은 「AI로 채우기」로 가설 초안을 받을 수 있어요. 5단계 진짜 동기는 자동으로 연결됩니다.";

  if (variant === "intro") {
    return (
      <AnimatedCoachPanel
        sceneKey={`stage-9-concept-${projectId}-intro`}
        statusLabel={stageConfig.introStatusLabel ?? "짚어주는 중"}
        statusSub="컨셉 정리하기"
        messages={introMessages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={`stage-9-concept-${projectId}-work`}
      statusLabel={stageConfig.workStatusLabel ?? "듣는 중"}
      statusSub={stageConfig.workStatusSub ?? "컨셉 시트"}
      messages={[
        {
          type: "bubble",
          content: formatCoachDialogBreaks(workHint),
        },
      ]}
      showComposer
      chatContext={chatContext}
      inputGuide={getStageWorkInputGuide(9)}
    />
  );
}
