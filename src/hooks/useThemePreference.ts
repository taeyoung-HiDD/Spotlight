"use client";

import { useCallback, useEffect, useState } from "react";
import type { ThemePreference } from "@/lib/theme/constants";
import {
  applyThemePreference,
  persistThemePreference,
  readStoredThemePreference,
  resolveDarkMode,
} from "@/lib/theme/applyTheme";

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredThemePreference();
    setPreference(stored);
    setIsDark(resolveDarkMode(stored));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyThemePreference("system");
      setIsDark(mq.matches);
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, ready]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
    setIsDark(resolveDarkMode(next));
    persistThemePreference(next);
  }, []);

  return { preference, isDark, ready, setThemePreference };
}
