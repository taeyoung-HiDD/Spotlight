"use client";

import { stageCaption } from "@/lib/stages/ui";

interface SimulatedAsyncProgressPanelProps {
  title: string;
  progress: number;
  remainingSec: number;
  ariaLabel: string;
  /** progress ≥ 90 일 때 남은 시간 대신 표시 (선택) */
  almostDoneLabel?: string;
  /** progress = 100 일 때 표시 (선택) */
  completingLabel?: string;
}

export function SimulatedAsyncProgressPanel({
  title,
  progress,
  remainingSec,
  ariaLabel,
  almostDoneLabel = "거의 다 됐어요…",
  completingLabel = "마무리하는 중…",
}: SimulatedAsyncProgressPanelProps) {
  const etaLabel =
    progress >= 100
      ? completingLabel
      : progress >= 90
        ? almostDoneLabel
        : `예상 남은 시간 약 ${remainingSec}초`;

  return (
    <div
      className="rounded-xl border border-spotlight/35 bg-highlight/50 px-4 py-3"
      role="status"
      aria-live="polite"
      aria-busy={progress < 100}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground break-keep">
          {title}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-gold">
          {progress}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-border-warm/90"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="h-full rounded-full bg-spotlight transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className={`mt-2 ${stageCaption} text-muted`}>{etaLabel}</p>
    </div>
  );
}
