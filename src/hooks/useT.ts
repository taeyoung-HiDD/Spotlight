"use client";

import { useCallback } from "react";
import { useUiLocale } from "@/hooks/useUiLocale";
import { t as translate, type MessageKey } from "@/lib/i18n/t";

export function useT() {
  const locale = useUiLocale();
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );
}
