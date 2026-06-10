import { STAGE_COUNT } from "@/lib/stages/constants";

/** 워크북 1–9 · 서비스 확장 10–15 (사이드바·StageProgressIndicator와 동일) */
const WORKBOOK_STAGE_END = 9;

interface HubStageProgressBarProps {
  /** 현재 진행 단계 (1–15) */
  stage: number;
}

/**
 * 허브 프로젝트 카드 — 전체 15단계 중 현재 위치
 * 지난 단계: 채움 · 현재: 노랑 강조 · 이후: 비움 (10–15는 점선)
 */
export function HubStageProgressBar({ stage }: HubStageProgressBarProps) {
  const current = Math.min(Math.max(1, Math.round(stage)), STAGE_COUNT);

  return (
    <div
      className="flex gap-[3px]"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={STAGE_COUNT}
      aria-label={`전체 ${STAGE_COUNT}단계 중 ${current}단계`}
    >
      {Array.from({ length: STAGE_COUNT }, (_, i) => {
        const step = i + 1;
        const isPast = step < current;
        const isCurrent = step === current;
        const isExtension = step > WORKBOOK_STAGE_END;

        if (isCurrent) {
          return (
            <div
              key={step}
              className="h-1 min-w-0 flex-1 rounded-sm bg-spotlight"
              title={`단계 ${step} · 현재`}
            />
          );
        }

        if (isPast) {
          return (
            <div
              key={step}
              className={[
                "h-1 min-w-0 flex-1 rounded-sm",
                isExtension ? "bg-spotlight/45" : "bg-foreground/70",
              ].join(" ")}
              title={`단계 ${step} · 완료`}
            />
          );
        }

        return (
          <div
            key={step}
            className={[
              "h-1 min-w-0 flex-1 rounded-sm",
              isExtension
                ? "border border-dashed border-border-warm bg-panel"
                : "bg-border-warm/70",
            ].join(" ")}
            title={`단계 ${step}`}
          />
        );
      })}
    </div>
  );
}
