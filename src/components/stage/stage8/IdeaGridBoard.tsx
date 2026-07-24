"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  filledIdeaCount,
  ideaGridCellCount,
  type IdeaGridData,
  type IdeaSketch,
} from "@/lib/stages/stage8/ideaGridTypes";
import { hmwForCell } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import { getGridCellHmwState } from "@/lib/stages/stage8/gridCellHmw";
import type { HmwQuestion } from "@/lib/stages/stage7/hmwTypes";
import { stageCaption, stageLabel } from "@/lib/stages/ui";

interface IdeaGridBoardProps {
  data: IdeaGridData;
  hmwQuestions: HmwQuestion[];
  onSelectCell: (index: number) => void;
}

function IdeaCellSketchThumbnail({ sketchDataUrl }: { sketchDataUrl: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-1">
      <div className="flex max-h-full w-full max-w-full items-center justify-center overflow-hidden rounded-md border border-border-warm/60 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={sketchDataUrl}
          alt=""
          className="max-h-[4.5rem] w-full object-contain object-center"
        />
      </div>
    </div>
  );
}

function FilledIdeaCell({
  slot,
  cellIndex,
}: {
  slot: IdeaSketch;
  cellIndex: number;
}) {
  const hasSketch = Boolean(slot.sketchDataUrl.trim());

  return (
    <>
      <p className="line-clamp-1 shrink-0 text-[12px] font-semibold leading-snug text-foreground break-keep">
        <LocalizedText>{slot.title}</LocalizedText>
      </p>

      {hasSketch ? (
        <IdeaCellSketchThumbnail sketchDataUrl={slot.sketchDataUrl} />
      ) : slot.description.trim() ? (
        <p className="line-clamp-2 min-h-0 flex-1 text-[11px] leading-snug text-muted break-keep">
          <LocalizedText>{slot.description}</LocalizedText>
        </p>
      ) : (
        <div className="min-h-0 flex-1" />
      )}

      <p className="shrink-0 text-[10px] text-muted">
        {cellIndex + 1}번
        {slot.scamperLetter ? ` · ${slot.scamperLetter}` : ""}
      </p>
    </>
  );
}

export function IdeaGridBoard({
  data,
  hmwQuestions,
  onSelectCell,
}: IdeaGridBoardProps) {
  const filled = filledIdeaCount(data);
  const cellCount = ideaGridCellCount(data);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className={stageLabel}>아이디어 그리드</span>
        <span className="rounded-md bg-highlight px-2 py-0.5 text-[11px] font-medium text-gold">
          {filled} / {cellCount} 채움 · HMW {hmwQuestions.length}개
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {data.slots.map((slot, index) => {
          const hasIdea = Boolean(slot?.title.trim());
          const cellHmw = hmwForCell(data, hmwQuestions, index);
          const cellState = getGridCellHmwState(cellHmw);
          const hmwText = cellHmw?.hmwText.trim() ?? "";
          const needText = cellHmw?.latentNeedText.trim() ?? "";

          return (
            <button
              key={`idea-cell-${index}-${data.cellHmwIds[index] || "empty"}`}
              type="button"
              onClick={() => onSelectCell(index)}
              className={[
                "flex aspect-square min-h-0 flex-col rounded-lg border p-2.5 text-left transition-colors",
                hasIdea
                  ? "border-border-warm bg-panel hover:border-spotlight/50"
                  : cellState === "hmw_ready"
                    ? "border-border-warm/80 bg-highlight/30 hover:border-spotlight/40 hover:bg-highlight/50"
                    : "border-dashed border-muted bg-cream/50 hover:border-spotlight/40 hover:bg-highlight/60",
              ].join(" ")}
            >
              {hasIdea ? (
                <FilledIdeaCell slot={slot!} cellIndex={index} />
              ) : cellState === "hmw_ready" ? (
                <>
                  <div className="min-h-0 flex-1">
                    <p className="mb-1 text-[9px] font-medium tracking-wide text-gold uppercase">
                      HMW
                    </p>
                    <p className="line-clamp-4 text-[11px] leading-snug text-foreground break-keep">
                      {hmwText}
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] text-muted">
                    {index + 1}번 · 아이디어 추가
                  </p>
                </>
              ) : cellState === "need_only" ? (
                <>
                  <div className="min-h-0 flex-1">
                    <p className="mb-1 text-[9px] font-medium tracking-wide text-muted uppercase">
                      잠재 니즈
                    </p>
                    <p className="line-clamp-3 text-[11px] leading-snug text-foreground break-keep">
                      {needText}
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] text-gold">
                    {index + 1}번 · HMW 질문 작성
                  </p>
                </>
              ) : (
                <>
                  <div className="flex min-h-0 flex-1 flex-col justify-center">
                    <p className="text-center text-[11px] leading-snug text-muted break-keep">
                      잠재 니즈 · HMW 질문 만들기
                    </p>
                  </div>
                  <p className="shrink-0 text-center text-[10px] text-muted">
                    {index + 1}번
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>

      <p className={`mt-3 ${stageCaption}`}>
        핵심 니즈 HMW로 먼저 펼치고, 더 필요하면 「다음 사분면에서 HMW 더
        가져오기」로 칸을 늘릴 수 있어요.
      </p>
    </div>
  );
}
