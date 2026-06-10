"use client";

import { useState } from "react";
import { IconBook2, IconX } from "@tabler/icons-react";
import { StageGuideLatentNeedsExample } from "@/components/stage/stage5/StageGuideLatentNeedsExample";
import { StageGuideUserJourneyExample } from "@/components/stage/stage6/StageGuideUserJourneyExample";
import { getStageActivityGuide } from "@/lib/stages/stageActivityGuides";
import { STAGE_META } from "@/lib/stages/constants";
import {
  stageBody,
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageLabel,
  stagePanel,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface StageActivityGuidePanelProps {
  stageNumber: number;
  mode: "gate" | "dialog";
  showDismissOption: boolean;
  onStart: (dontShowAgain: boolean) => void;
  onClose?: () => void;
}

export function StageActivityGuidePanel({
  stageNumber,
  mode,
  showDismissOption,
  onStart,
  onClose,
}: StageActivityGuidePanelProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const guide = getStageActivityGuide(stageNumber);
  const meta = STAGE_META[stageNumber];
  const isDialog = mode === "dialog";

  const panel = (
    <section
      className={[
        stagePanel,
        isDialog ? "relative max-h-[min(88vh,52rem)] overflow-y-auto" : "",
      ].join(" ")}
      aria-labelledby={`stage-guide-title-${stageNumber}`}
    >
      {isDialog && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="가이드 닫기"
          className="absolute top-4 right-4 rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <IconX className="size-5" stroke={2} />
        </button>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-cream/60 px-2.5 py-1 text-[13px] font-semibold text-foreground">
          <IconBook2 className="size-4 text-gold" stroke={2} />
          단계 가이드
        </span>
        {meta ? (
          <span className={stageCaption}>
            {meta.macro} · 단계 {stageNumber}
          </span>
        ) : null}
      </div>

      <h2
        id={`stage-guide-title-${stageNumber}`}
        className={stageSectionTitle}
      >
        {guide.headline}
      </h2>
      <p className={`mt-2 mb-5 ${stageBody}`}>{guide.summary}</p>

      <div className="mb-5">
        <p className={`mb-3 ${stageLabel}`}>이 단계에서 할 일</p>
        <ol className="space-y-3">
          {guide.activities.map((activity, index) => (
            <li
              key={activity.title}
              className="flex gap-3 rounded-xl border border-border-warm bg-cream/40 px-3.5 py-3"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-spotlight text-[13px] font-bold text-on-spotlight"
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-foreground break-keep">
                  {activity.title}
                </p>
                <p className={`mt-0.5 ${stageCaption}`}>{activity.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-5">
        <p className={`mb-2 ${stageLabel}`}>{guide.example.label}</p>
        {guide.visualExample?.type === "latent_needs_board" ? (
          <>
            <p className={`mb-3 ${stageCaption} break-keep`}>
              {guide.example.content}
            </p>
            <StageGuideLatentNeedsExample visual={guide.visualExample} />
            {guide.visualExample.caption ? (
              <p className={`mt-3 ${stageCaption} break-keep`}>
                {guide.visualExample.caption}
              </p>
            ) : null}
          </>
        ) : guide.visualExample?.type === "user_journey_map" ? (
          <>
            <p className={`mb-3 ${stageCaption} break-keep`}>
              {guide.example.content}
            </p>
            <StageGuideUserJourneyExample visual={guide.visualExample} />
            {guide.visualExample.caption ? (
              <p className={`mt-3 ${stageCaption} break-keep`}>
                {guide.visualExample.caption}
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-gold/35 bg-highlight px-4 py-3.5">
            <p className={`${stageBody} break-keep`}>{guide.example.content}</p>
          </div>
        )}
      </div>

      {guide.tip ? (
        <p className={`mb-5 ${stageCaption}`}>팁: {guide.tip}</p>
      ) : null}

      <div
        className={[
          "flex flex-col gap-3 border-t border-border-warm pt-4 sm:flex-row sm:items-center sm:justify-between",
          isDialog ? "sticky bottom-0 bg-panel pb-1" : "",
        ].join(" ")}
      >
        {showDismissOption ? (
          <label className="inline-flex cursor-pointer items-center gap-2.5 break-keep">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="size-4 shrink-0 rounded border-border-warm accent-spotlight"
            />
            <span className={stageCaption}>다음부터 보지 않기</span>
          </label>
        ) : (
          <span className={stageCaption}>
            가이드는 단계 제목 옆 「가이드 보기」에서 다시 열 수 있어요.
          </span>
        )}

        <div className="flex flex-wrap gap-2">
          {isDialog && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className={stageBtnSecondary}
            >
              닫기
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onStart(dontShowAgain)}
            className={stageBtnPrimary}
          >
            {isDialog ? "확인" : "시작하기 →"}
          </button>
        </div>
      </div>
    </section>
  );

  if (isDialog) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`stage-guide-title-${stageNumber}`}
      >
        <div
          className={[
            "w-full",
            guide.visualExample?.type === "user_journey_map"
              ? "max-w-4xl"
              : guide.visualExample
                ? "max-w-3xl"
                : "max-w-2xl",
          ].join(" ")}
        >
          {panel}
        </div>
      </div>
    );
  }

  return panel;
}
