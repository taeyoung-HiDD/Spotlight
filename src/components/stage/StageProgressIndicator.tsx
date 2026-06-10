import { STAGE_COUNT } from "@/lib/stages/constants";

const WORKBOOK_STAGES = 9;

interface StageProgressIndicatorProps {
  currentStage: number;
  completedStages?: number[];
}

const STAGE_META_SHORT: Record<number, string> = {
  1: "온보딩",
  2: "맥락 이해하기",
  3: "사용자 조사 준비하기",
  4: "분석·공감맵",
  5: "Needs",
  6: "여정 그리기",
  7: "Ideation",
  8: "우선순위",
  9: "Concept",
  10: "프로토타입",
  11: "검증",
  12: "타당성",
  13: "로드맵",
  14: "피치 덱",
  15: "매칭",
};

/**
 * 컷 2+ · 15점 진행 인디케이터 (1–9 워크북 · 10–15 확장 점선)
 */
export function StageProgressIndicator({
  currentStage,
  completedStages = [],
}: StageProgressIndicatorProps) {
  return (
    <div
      className="flex items-center gap-0"
      role="img"
      aria-label={`15단계 중 ${currentStage}단계`}
    >
      {Array.from({ length: STAGE_COUNT }, (_, i) => {
        const stage = i + 1;
        const isComplete = completedStages.includes(stage);
        const isCurrent = stage === currentStage;
        const isService = stage > WORKBOOK_STAGES;
        const showSep =
          stage === WORKBOOK_STAGES + 1 ? (
            <div
              key={`sep-${stage}`}
              className="relative z-[1] mx-1.5 h-3.5 w-px bg-border-warm"
              aria-hidden
            />
          ) : null;

        return (
          <span key={stage} className="contents">
            {showSep}
            <div className="relative z-[1] flex min-w-0 flex-1 flex-col items-center">
              <div
                title={`단계 ${stage} · ${STAGE_META_SHORT[stage] ?? stage}`}
                className={[
                  "flex items-center justify-center rounded-full transition-all duration-200",
                  isCurrent
                    ? "size-[22px] bg-spotlight"
                    : isComplete
                      ? "size-3.5 bg-spotlight"
                      : isService
                        ? "size-2 border border-dashed border-border-warm bg-panel"
                        : "size-2 border border-border-warm bg-panel",
                ].join(" ")}
              >
                {isCurrent && (
                  <span className="font-mono text-[10px] font-medium text-on-spotlight">
                    {String(stage).padStart(2, "0")}
                  </span>
                )}
                {isComplete && !isCurrent && (
                  <svg width="8" height="8" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 8L7 12L13 4"
                      stroke="#2D2D2A"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              {isCurrent && (
                <span className="mt-1 whitespace-nowrap text-xs font-semibold text-foreground">
                  {STAGE_META_SHORT[stage]}
                </span>
              )}
            </div>
          </span>
        );
      })}
    </div>
  );
}
