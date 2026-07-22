"use client";

import { useMemo, useState } from "react";
import { IconBook2, IconX } from "@tabler/icons-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { StageGuideLatentNeedsExample } from "@/components/stage/stage5/StageGuideLatentNeedsExample";
import { StageGuideUserJourneyExample } from "@/components/stage/stage6/StageGuideUserJourneyExample";
import { StageGuideHmwExample } from "@/components/stage/stage7/StageGuideHmwExample";
import { useT } from "@/hooks/useT";
import { useUiLocale } from "@/hooks/useUiLocale";
import { getStageActivityGuide } from "@/lib/stages/stageActivityGuides";
import { SIDEBAR_MACRO_GROUPS } from "@/lib/stages/sidebarNav";
import type { MessageKey } from "@/lib/i18n/messages";
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
  variant?: "full" | "minimal";
  showDismissOption: boolean;
  onStart: (dontShowAgain: boolean) => void;
  onClose?: () => void;
}

const MACRO_MESSAGE_KEYS: Record<string, MessageKey> = {
  empathize: "macro.empathize",
  analyze: "macro.analyze",
  ideate: "macro.ideate",
  prototype: "macro.prototype",
  business: "macro.business",
};

export function StageActivityGuidePanel({
  stageNumber,
  mode,
  variant = "full",
  showDismissOption,
  onStart,
  onClose,
}: StageActivityGuidePanelProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const locale = useUiLocale();
  const t = useT();
  const guide = useMemo(
    () => getStageActivityGuide(stageNumber, locale),
    [stageNumber, locale],
  );
  const isDialog = mode === "dialog";
  const isMinimal = variant === "minimal";

  const macroGroup = SIDEBAR_MACRO_GROUPS.find((g) =>
    g.stages.some((s) => s.id === stageNumber),
  );
  const macroLabel = macroGroup
    ? t(MACRO_MESSAGE_KEYS[macroGroup.id] ?? "macro.empathize")
    : "";

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
          aria-label={t("guide.closeAria")}
          className="absolute top-4 right-4 rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          <IconX className="size-5" stroke={2} />
        </button>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-cream/60 px-2.5 py-1 text-[13px] font-semibold text-foreground">
          <IconBook2 className="size-4 text-gold" stroke={2} />
          {t("guide.badge")}
        </span>
        {macroGroup ? (
          <span className={stageCaption}>
            {t("guide.stageMeta", { macro: macroLabel, stage: stageNumber })}
          </span>
        ) : null}
      </div>

      <h2
        id={`stage-guide-title-${stageNumber}`}
        className={stageSectionTitle}
      >
        <LocalizedText>{guide.headline}</LocalizedText>
      </h2>
      {!isMinimal ? (
        <p className={`mt-2 mb-5 ${stageBody}`}>
          <LocalizedText>{guide.summary}</LocalizedText>
        </p>
      ) : (
        <p className={`mt-2 mb-5 ${stageCaption}`}>{t("guide.minimalLead")}</p>
      )}

      <div className="mb-5">
        <p className={`mb-3 ${stageLabel}`}>{t("guide.todoHeading")}</p>
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
                  <LocalizedText>{activity.title}</LocalizedText>
                </p>
                {!isMinimal ? (
                  <p className={`mt-0.5 ${stageCaption}`}>
                    <LocalizedText>{activity.description}</LocalizedText>
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {!isMinimal ? (
        <>
          <div className="mb-5">
            <p className={`mb-2 ${stageLabel}`}>
              <LocalizedText>{guide.example.label}</LocalizedText>
            </p>
            {guide.visualExample?.type === "latent_needs_board" ? (
              <>
                <p className={`mb-3 ${stageCaption} break-keep`}>
                  <LocalizedText>{guide.example.content}</LocalizedText>
                </p>
                <StageGuideLatentNeedsExample visual={guide.visualExample} />
                {guide.visualExample.caption ? (
                  <p className={`mt-3 ${stageCaption} break-keep`}>
                    <LocalizedText>{guide.visualExample.caption}</LocalizedText>
                  </p>
                ) : null}
              </>
            ) : guide.visualExample?.type === "user_journey_map" ? (
              <>
                <p className={`mb-3 ${stageCaption} break-keep`}>
                  <LocalizedText>{guide.example.content}</LocalizedText>
                </p>
                <StageGuideUserJourneyExample visual={guide.visualExample} />
                {guide.visualExample.caption ? (
                  <p className={`mt-3 ${stageCaption} break-keep`}>
                    <LocalizedText>{guide.visualExample.caption}</LocalizedText>
                  </p>
                ) : null}
              </>
            ) : guide.visualExample?.type === "hmw_board" ? (
              <>
                <p className={`mb-3 ${stageCaption} break-keep`}>
                  <LocalizedText>{guide.example.content}</LocalizedText>
                </p>
                <StageGuideHmwExample visual={guide.visualExample} />
                {guide.visualExample.caption ? (
                  <p className={`mt-3 ${stageCaption} break-keep`}>
                    <LocalizedText>{guide.visualExample.caption}</LocalizedText>
                  </p>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-gold/35 bg-highlight px-4 py-3.5">
                <p className={`${stageBody} break-keep`}>
                  <LocalizedText>{guide.example.content}</LocalizedText>
                </p>
              </div>
            )}
          </div>

          {guide.tip ? (
            <p className={`mb-5 ${stageCaption}`}>
              {t("guide.tipPrefix")}{" "}
              <LocalizedText>{guide.tip}</LocalizedText>
            </p>
          ) : null}
        </>
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
            <span className={stageCaption}>{t("guide.dontShowAgain")}</span>
          </label>
        ) : (
          <span className={stageCaption}>{t("guide.reopenHint")}</span>
        )}

        <div className="flex flex-wrap gap-2">
          {isDialog && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className={stageBtnSecondary}
            >
              {t("guide.close")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onStart(dontShowAgain)}
            className={stageBtnPrimary}
          >
            {isDialog ? t("guide.confirm") : t("guide.start")}
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
