"use client";

import { useSyncExternalStore } from "react";
import {
  type UiLocale,
  resolveUiLocaleFromNavigator,
} from "@/lib/i18n/uiLocale";

export function useUiLocale(): UiLocale {
  return useSyncExternalStore(
    () => () => {},
    resolveUiLocaleFromNavigator,
    () => "ko",
  );
}
