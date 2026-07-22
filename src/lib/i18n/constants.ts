import type { UiLocale } from "@/lib/i18n/uiLocale";

export const UI_LOCALE_STORAGE_KEY = "spotlight-ui-locale";

export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  ko: "KO",
  en: "EN",
};

export function isValidUiLocale(value: string): value is UiLocale {
  return value === "ko" || value === "en";
}
