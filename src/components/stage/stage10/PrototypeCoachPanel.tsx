"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { useMemo } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { getStageConfig } from "@/config/stageConfig";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import type { ConceptSheetData } from "@/lib/stages/stage9/conceptSheetTypes";
import type { PrototypeData } from "@/lib/stages/stage10/prototypeTypes";

function summarizePrototype(
  concept: ConceptSheetData,
  proto: PrototypeData,
): string {
  const lines: string[] = [];
  if (concept.conceptName.trim()) lines.push(`컨셉: ${concept.conceptName}`);
  lines.push(`플랫폼: ${proto.platform === "mobile" ? "Mobile" : "Web"}`);
  lines.push(proto.html.trim() ? "시제품 HTML 생성됨" : "시제품 미생성");
  return lines.join("\n");
}

interface PrototypeCoachPanelProps {
  projectId: string;
  concept: ConceptSheetData;
  data: PrototypeData;
  variant: "intro" | "work";
}

export function PrototypeCoachPanel({
  projectId,
  concept,
  data,
  variant,
}: PrototypeCoachPanelProps) {
  const stageConfig = getStageConfig(11);
  const locale = useUiLocale();
  const purpose = getStagePurposeCopy(11, locale);

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
          "9단계 컨셉·스토리보드를 바탕으로 실제 화면처럼 보이는 시제품 HTML을 Groq가 만들어요. Mobile/Web을 고른 뒤 「AI 시제품 생성」을 눌러 보세요.",
        ),
      },
    ];
  }, [purpose]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 11,
      stageTitle: "시제품 만들기",
      artifactSummary: summarizePrototype(concept, data),
      stageBehaviorNote:
        "10단계 시제품: 컨셉 시트·스토리보드 5컷과 1:1 매핑되는 UI 목업 HTML을 생성합니다.",
    }),
    [projectId, concept, data],
  );

  const workHint = data.html.trim()
    ? "미리보기에서 흐름을 확인해 보세요. 다시 생성하거나 플랫폼을 바꿀 수 있어요."
    : concept.conceptName.trim()
      ? "플랫폼을 고르고 AI 시제품을 생성해 보세요."
      : "9단계 컨셉 시트를 먼저 채우면 시제품 생성이 더 정확해져요.";

  if (variant === "intro") {
    return (
      <AnimatedCoachPanel
        sceneKey={`stage-10-proto-${projectId}-intro`}
        statusLabel={stageConfig.introStatusLabel ?? "짚어주는 중"}
        statusSub="시제품 만들기"
        messages={introMessages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={`stage-10-proto-${projectId}-work`}
      statusLabel={stageConfig.workStatusLabel ?? "제안 중"}
      statusSub={stageConfig.workStatusSub ?? "시제품"}
      messages={[
        {
          type: "bubble",
          content: formatCoachDialogBreaks(workHint),
        },
      ]}
      showComposer
      chatContext={chatContext}
      inputGuide={getStageWorkInputGuide(11, locale)}
    />
  );
}
