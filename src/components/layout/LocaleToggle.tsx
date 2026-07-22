"use client";

import { useSetUiLocale, useUiLocale, useUiLocaleReady } from "@/hooks/useUiLocale";
import { UI_LOCALE_LABELS } from "@/lib/i18n/constants";
import type { UiLocale } from "@/lib/i18n/uiLocale";

const OPTIONS: UiLocale[] = ["ko", "en"];

interface LocaleToggleProps {
  /** 마케팅 다크 GNB용 */
  variant?: "default" | "onDark";
}

/** GNB 우측 — KO / EN 전환 */
export function LocaleToggle({ variant = "default" }: LocaleToggleProps) {
  const locale = useUiLocale();
  const setLocale = useSetUiLocale();
  const ready = useUiLocaleReady();
  const onDark = variant === "onDark";

  return (
    <div
      role="radiogroup"
      aria-label={locale === "en" ? "Language" : "언어"}
      className={[
        "flex items-center rounded-md border p-0.5",
        onDark
          ? "border-white/25 bg-white/10"
          : "border-border-warm bg-cream",
      ].join(" ")}
    >
      {OPTIONS.map((id) => {
        const selected = ready && locale === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={id === "ko" ? "한국어" : "English"}
            title={id === "ko" ? "한국어" : "English"}
            onClick={() => setLocale(id)}
            className={[
              "flex h-7 min-w-7 items-center justify-center rounded-[5px] px-1.5 text-[10px] font-semibold tracking-wide transition-colors",
              selected
                ? onDark
                  ? "bg-spotlight text-on-spotlight shadow-sm"
                  : "bg-panel text-foreground shadow-sm"
                : onDark
                  ? "text-white/70 hover:text-white"
                  : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {UI_LOCALE_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}
