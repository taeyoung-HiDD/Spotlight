"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { fetchStage4Discoveries } from "@/lib/artifacts/stage4Discoveries";
import { stageChatTitle } from "@/lib/coach/chatClient";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { getStageConfig } from "@/config/stageConfig";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";

const STAGE5_NEEDS_DIRECTIVE = `5단계 진짜 필요 찾기:
- 4단계 언급·관찰을 바탕으로 잠재 니즈를 정리하는 단계입니다.
- 결론처럼 말하지 않고, 검증 포인트를 짧게 제안합니다.
- 조사 대상 필터(전체·개별)로 보고 싶은 사람의 언급·관찰·잠재 니즈만 볼 수 있습니다.`;

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function buildIntroMessages(
  data: Stage5LatentNeedsData,
  subjectCountFromStage4: number,
): CoachDialogItem[] {
  const purpose = getStagePurposeCopy(5);
  const messages: CoachDialogItem[] = [
    {
      type: "highlight",
      label: purpose.label,
      content: formatCoachDialogBreaks(purpose.purpose),
    },
    {
      type: "bubble",
      content: formatCoachDialogBreaks(
        "4단계에서 모은 언급·관찰을 한 보드에 모았어요. 위에서 전체 또는 조사 대상을 골라 해당하는 결과만 볼 수 있어요.",
      ),
    },
  ];

  if (data.kevinGeneratedAt) {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        "보라색 잠재 니즈 포스트잇은 Kevin이 언급·관찰을 바탕으로 적어 둔 초안이에요. 맞는지·빠진 게 있는지 함께 다듬어 보세요.",
      ),
    });
  } else if (subjectCountFromStage4 > 0) {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        "조사 내용을 불러오는 중이에요. 잠시 후 잠재 니즈 초안이 채워질 거예요.",
      ),
    });
  } else {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        "4단계 데이터 정리에 언급·관찰이 있으면 여기로 가져와요. 먼저 4단계를 채우고 돌아와도 괜찮아요.",
      ),
    });
  }

  const sampleSubject = data.subjects[0];
  if (sampleSubject) {
    const quote = data.postits.find(
      (p) => p.subjectId === sampleSubject.id && p.kind === "quote",
    );
    if (quote?.text.trim()) {
      messages.push({
        type: "highlight",
        label: subjectDisplayLabel(sampleSubject.name, 0),
        content: formatCoachDialogBreaks(
          `언급 예: 「${clip(quote.text, 64)}」 — 이 아래에 있을 수 있는 니즈를 잠재 니즈로 적어 보세요.`,
        ),
      });
    }
  }

  return messages;
}

function summarizeBoard(data: Stage5LatentNeedsData): string {
  const lines: string[] = [];
  for (const subject of data.subjects) {
    const label = subject.name.trim() || subject.id;
    const quotes = data.postits
      .filter((p) => p.subjectId === subject.id && p.kind === "quote")
      .map((p) => p.text.trim())
      .filter(Boolean);
    const observations = data.postits
      .filter((p) => p.subjectId === subject.id && p.kind === "observation")
      .map((p) => p.text.trim())
      .filter(Boolean);
    const findings = data.postits
      .filter((p) => p.subjectId === subject.id && p.kind === "finding")
      .map((p) => p.text.trim())
      .filter(Boolean);
    const latent = data.postits
      .filter((p) => p.subjectId === subject.id && p.kind === "latent_need")
      .map((p) => p.text.trim())
      .filter(Boolean);
    lines.push(
      `[${label}] 언급 ${quotes.length} · 관찰 ${observations.length} · 발견 ${findings.length} · 잠재 니즈 ${latent.length}`,
    );
    for (const q of quotes.slice(0, 2)) lines.push(`  - 언급: ${q}`);
    for (const o of observations.slice(0, 2)) lines.push(`  - 관찰: ${o}`);
    for (const f of findings.slice(0, 2)) lines.push(`  - 발견: ${f}`);
    for (const l of latent.slice(0, 3)) lines.push(`  - 잠재 니즈: ${l}`);
  }
  return lines.join("\n");
}

interface LatentNeedsCoachPanelProps {
  projectId: string;
  data: Stage5LatentNeedsData;
  variant: "intro" | "work";
}

export function LatentNeedsCoachPanel({
  projectId,
  data,
  variant,
}: LatentNeedsCoachPanelProps) {
  const stageConfig = getStageConfig(5);
  const [stage4SubjectCount, setStage4SubjectCount] = useState(0);
  const [contextReady, setContextReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s4 = await fetchStage4Discoveries(projectId);
        if (cancelled) return;
        setStage4SubjectCount(
          s4.data.researchSynthesis.subjects.filter((s) => s.name.trim())
            .length,
        );
      } catch {
        if (!cancelled) setStage4SubjectCount(0);
      } finally {
        if (!cancelled) setContextReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const introMessages = useMemo((): CoachDialogItem[] => {
    if (!contextReady) {
      return [{ type: "bubble", content: "프로젝트 맥락을 불러오는 중이에요…" }];
    }
    return buildIntroMessages(data, stage4SubjectCount);
  }, [contextReady, data, stage4SubjectCount]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 5,
      stageTitle: stageChatTitle(5),
      artifactSummary: summarizeBoard(data),
      stageBehaviorNote: STAGE5_NEEDS_DIRECTIVE,
    }),
    [projectId, data],
  );

  if (variant === "intro") {
    return (
      <AnimatedCoachPanel
        sceneKey={`stage-5-needs-${projectId}-intro-${contextReady ? "ready" : "load"}`}
        statusLabel={stageConfig.introStatusLabel ?? "함께 짚어보는 중"}
        statusSub={stageConfig.introStatusSub ?? "니즈 분석하기"}
        messages={introMessages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={`stage-5-needs-work-${projectId}`}
      statusLabel="함께 짚어보는 중"
      statusSub="니즈 분석하기"
      messages={introMessages}
      chatContext={chatContext}
      inputGuide={getStageWorkInputGuide(5)}
      showComposer
    />
  );
}
