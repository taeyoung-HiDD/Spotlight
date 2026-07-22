"use client";

import { useEffect, useMemo, useState } from "react";
import { useUiLocale } from "@/hooks/useUiLocale";
import {
  readTranslateCache,
  shouldSkipTranslate,
  writeTranslateCache,
} from "@/lib/i18n/contentTranslateCache";

async function requestTranslations(texts: string[]): Promise<string[]> {
  const res = await fetch("/api/i18n/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, target: "en" }),
  });
  const data = (await res.json()) as { translations?: string[] };
  if (!Array.isArray(data.translations) || data.translations.length !== texts.length) {
    return texts;
  }
  return data.translations;
}

/**
 * 산출물 표시·편집 텍스트 로컬라이즈.
 * locale=ko → 원문. locale=en → 캐시/API 번역.
 * 편집 저장은 useLocalizedEditable가 EN 값을 반영한다.
 */
export function useLocalizedContent(text: string): {
  text: string;
  translating: boolean;
} {
  const locale = useUiLocale();
  const source = text ?? "";
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (locale !== "en" || shouldSkipTranslate(source)) {
      setTranslated(null);
      setTranslating(false);
      return;
    }

    const cached = readTranslateCache(source, "en");
    if (cached) {
      setTranslated(cached);
      setTranslating(false);
      return;
    }

    let cancelled = false;
    setTranslating(true);
    void requestTranslations([source])
      .then((list) => {
        if (cancelled) return;
        const next = list[0] ?? source;
        writeTranslateCache(source, "en", next);
        setTranslated(next);
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, source]);

  if (locale !== "en" || shouldSkipTranslate(source)) {
    return { text: source, translating: false };
  }
  return { text: translated ?? source, translating };
}

/** 여러 문장을 한 번에 번역 (목록·보드용) */
export function useLocalizedContentList(texts: string[]): {
  texts: string[];
  translating: boolean;
} {
  const locale = useUiLocale();
  const fingerprint = useMemo(
    () => texts.map((t) => t ?? "").join("\u0001"),
    [texts],
  );
  const sources = useMemo(
    () => fingerprint.split("\u0001"),
    [fingerprint],
  );
  const [translated, setTranslated] = useState<string[] | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    if (locale !== "en") {
      setTranslated(null);
      setTranslating(false);
      return;
    }

    const needIdx: number[] = [];
    const next = sources.map((s, i) => {
      if (shouldSkipTranslate(s)) return s;
      const cached = readTranslateCache(s, "en");
      if (cached) return cached;
      needIdx.push(i);
      return s;
    });

    if (!needIdx.length) {
      setTranslated(next);
      setTranslating(false);
      return;
    }

    let cancelled = false;
    setTranslating(true);
    const payload = needIdx.map((i) => sources[i]!);
    void requestTranslations(payload)
      .then((list) => {
        if (cancelled) return;
        const merged = [...next];
        needIdx.forEach((srcIdx, j) => {
          const value = list[j] ?? sources[srcIdx]!;
          writeTranslateCache(sources[srcIdx]!, "en", value);
          merged[srcIdx] = value;
        });
        setTranslated(merged);
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, fingerprint, sources]);

  if (locale !== "en") {
    return { texts: sources, translating: false };
  }
  return { texts: translated ?? sources, translating };
}
