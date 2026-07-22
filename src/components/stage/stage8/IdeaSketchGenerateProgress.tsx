"use client";

import { SimulatedAsyncProgressPanel } from "@/components/stage/SimulatedAsyncProgressPanel";

interface IdeaSketchGenerateProgressProps {
  progress: number;
  remainingSec: number;
}

export function IdeaSketchGenerateProgress({
  progress,
  remainingSec,
}: IdeaSketchGenerateProgressProps) {
  return (
    <SimulatedAsyncProgressPanel
      title="AI가 스케치 그리는 중…"
      progress={progress}
      remainingSec={remainingSec}
      ariaLabel="AI 스케치 생성 진행률"
      completingLabel="스케치를 불러오는 중…"
    />
  );
}
