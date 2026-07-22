"use client";

import { useOptionalUiLocale } from "@/components/i18n/UiLocaleProvider";
import type { UiLocale } from "@/lib/i18n/uiLocale";

/** 현재 UI 로케일 — Provider가 있으면 선택값, 없으면 ko */
export function useUiLocale(): UiLocale {
  return useOptionalUiLocale().locale;
}

export function useSetUiLocale() {
  return useOptionalUiLocale().setLocale;
}

export function useUiLocaleReady(): boolean {
  return useOptionalUiLocale().ready;
}
