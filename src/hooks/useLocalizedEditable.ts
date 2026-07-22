"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { useUiLocale } from "@/hooks/useUiLocale";
import { shouldSkipTranslate } from "@/lib/i18n/contentTranslateCache";

/**
 * 편집 필드용 — EN 모드에서 한글 원문을 영문으로 보여 주고,
 * 입력·blur 시 영문 값을 onChange로 저장한다 (DB에 EN 반영).
 */
export function useLocalizedEditable(
  value: string,
  onChange: (next: string) => void,
  options?: {
    /** 포커스 후 blur 시 번역문을 자동 저장 (기본 true) */
    persistTranslatedOnBlur?: boolean;
  },
): {
  value: string;
  onChange: (next: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  translating: boolean;
} {
  const locale = useUiLocale();
  const persistOnBlur = options?.persistTranslatedOnBlur !== false;
  const source = value ?? "";
  const { text: localized, translating } = useLocalizedContent(source);
  const [draft, setDraft] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current) {
      if (source === draft) {
        dirtyRef.current = false;
        setDraft(null);
      }
      return;
    }
    setDraft(null);
  }, [source, draft]);

  useEffect(() => {
    if (locale !== "en") {
      dirtyRef.current = false;
      setDraft(null);
      focusedRef.current = false;
    }
  }, [locale]);

  if (locale !== "en") {
    return {
      value: source,
      onChange: (next) => onChange(next),
      onFocus: () => undefined,
      onBlur: () => undefined,
      translating: false,
    };
  }

  const display = draft ?? localized;

  return {
    value: display,
    translating: draft === null && translating,
    onChange: (next) => {
      dirtyRef.current = true;
      focusedRef.current = true;
      setDraft(next);
      onChange(next);
    },
    onFocus: () => {
      focusedRef.current = true;
    },
    onBlur: () => {
      const wasFocused = focusedRef.current;
      focusedRef.current = false;
      if (!persistOnBlur || !wasFocused) return;
      if (dirtyRef.current) return;
      if (translating) return;
      if (shouldSkipTranslate(source)) return;
      if (!localized || localized === source) return;
      dirtyRef.current = true;
      setDraft(localized);
      onChange(localized);
    },
  };
}
