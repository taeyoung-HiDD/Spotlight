"use client";

import { IconArrowRight, IconCheck } from "@tabler/icons-react";
import { GuidanceStyleThumbnail } from "@/components/stage/stage1/GuidanceStyleThumbnail";
import {
  GUIDANCE_STYLE_OPTIONS,
  type GuidanceStyle,
} from "@/lib/stages/stage1/guidanceStyle";
import {
  stageBody,
  stageBtnPrimary,
  stageCaption,
  stageLabel,
  stagePanel,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface GuidanceStylePickerProps {
  value: GuidanceStyle | null;
  onChange: (style: GuidanceStyle) => void;
  showContinue?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
}

export function GuidanceStylePicker({
  value,
  onChange,
  showContinue = false,
  onContinue,
  continueLabel = "다음으로 이동",
}: GuidanceStylePickerProps) {
  return (
    <section className={stagePanel}>
      <p className={stageLabel}>코칭 방식</p>
      <h2 className={`mt-1 ${stageSectionTitle}`}>
        어떤 방식으로 함께할까요?
      </h2>
      <p className={`mt-2 mb-5 ${stageBody}`}>
        편한 쪽을 고르시면 그에 맞춰 코치와 가이드를 조정할게요. 선택한 방식은
        이후 모든 단계에 적용돼요.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {GUIDANCE_STYLE_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={[
                "group relative flex flex-col rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-spotlight bg-yellow-tint ring-1 ring-spotlight/40"
                  : "border-border-warm bg-panel hover:border-spotlight/35 hover:bg-cream/30",
              ].join(" ")}
            >
              {selected ? (
                <span className="absolute top-3 right-3 inline-flex size-6 items-center justify-center rounded-full bg-spotlight text-on-spotlight">
                  <IconCheck className="size-3.5" stroke={2.5} aria-hidden />
                </span>
              ) : null}

              <div className="w-full">
                <GuidanceStyleThumbnail style={option.id} />
              </div>

              <div className="mt-3">
                <div className="text-[17px] font-semibold text-foreground">
                  {option.title}
                </div>
                <p className={`mt-1 ${stageCaption}`}>{option.subtitle}</p>
              </div>

              <ul className={`mt-3 space-y-1.5 ${stageCaption}`}>
                {option.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 break-keep">
                    <span
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-gold"
                      aria-hidden
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {showContinue && value ? (
        <div className="mt-5 border-t border-dashed border-border-warm pt-5">
          <p className={`mb-4 ${stageCaption}`}>
            「{GUIDANCE_STYLE_OPTIONS.find((o) => o.id === value)?.title}」
            방식으로 맞췄어요.
          </p>
          <button
            type="button"
            onClick={onContinue}
            className={`${stageBtnPrimary} inline-flex w-full items-center justify-center gap-1.5 sm:w-auto`}
          >
            {continueLabel}
            <IconArrowRight className="size-4" stroke={2} aria-hidden />
          </button>
        </div>
      ) : null}
    </section>
  );
}
