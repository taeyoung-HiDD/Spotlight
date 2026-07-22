"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentLang,
  persistUiLocale,
  resolveInitialUiLocale,
} from "@/lib/i18n/applyLocale";
import type { UiLocale } from "@/lib/i18n/uiLocale";

interface UiLocaleContextValue {
  locale: UiLocale;
  ready: boolean;
  setLocale: (locale: UiLocale) => void;
}

const UiLocaleContext = createContext<UiLocaleContextValue | null>(null);

export function UiLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>("ko");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = resolveInitialUiLocale();
    setLocaleState(initial);
    applyDocumentLang(initial);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: UiLocale) => {
    setLocaleState(next);
    persistUiLocale(next);
  }, []);

  const value = useMemo(
    () => ({ locale, ready, setLocale }),
    [locale, ready, setLocale],
  );

  return (
    <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>
  );
}

export function useUiLocaleContext(): UiLocaleContextValue {
  const ctx = useContext(UiLocaleContext);
  if (!ctx) {
    throw new Error("useUiLocaleContext must be used within UiLocaleProvider");
  }
  return ctx;
}

/** Provider 밖(테스트 등)에서도 안전하게 — 없으면 ko */
export function useOptionalUiLocale(): UiLocaleContextValue {
  return (
    useContext(UiLocaleContext) ?? {
      locale: "ko" as UiLocale,
      ready: true,
      setLocale: () => {},
    }
  );
}
