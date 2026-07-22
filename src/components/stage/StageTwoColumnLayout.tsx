"use client";

import type { ReactNode } from "react";
import { StageRevealItem } from "@/components/stage/motion/StageReveal";
import { useArchiveView } from "@/lib/archive/archiveViewContext";
import { MOTION } from "@/lib/motion/timings";
import { stageCoachColumn, stageWorkColumn, stageWorkSplit } from "@/lib/stages/ui";

interface StageTwoColumnLayoutProps {
  work: ReactNode;
  coach: ReactNode;
}

/**
 * 작업(좌) · 코치(우) — 좌측 열 먼저 등장(index 0), 우측 코치 열 다음(index 1).
 * 모든 2열 스테이지(컷 2+)에서 동일 순서.
 */
export function StageTwoColumnLayout({ work, coach }: StageTwoColumnLayoutProps) {
  const archiveView = useArchiveView();

  if (archiveView) {
    return (
      <StageRevealItem index={MOTION.columnWorkRevealIndex}>{work}</StageRevealItem>
    );
  }

  return (
    <div className={stageWorkSplit}>
      <div className={stageWorkColumn}>
        <StageRevealItem index={MOTION.columnWorkRevealIndex}>
          {work}
        </StageRevealItem>
      </div>
      <div
        className={`${stageCoachColumn} flex min-h-0 flex-col lg:sticky lg:top-0 lg:max-h-[calc(100dvh-52px)] lg:self-start`}
      >
        <StageRevealItem
          index={MOTION.columnCoachRevealIndex}
          className="flex min-h-0 flex-1 flex-col"
        >
          {coach}
        </StageRevealItem>
      </div>
    </div>
  );
}
