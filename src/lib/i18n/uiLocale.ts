export type UiLocale = "ko" | "en";

export function resolveUiLocaleFromLanguageTag(tag: string): UiLocale {
  return tag.trim().toLowerCase().startsWith("ko") ? "ko" : "en";
}

/** 브라우저·OS 선호 언어 (클라이언트 전용) */
export function resolveUiLocaleFromNavigator(): UiLocale {
  if (typeof navigator === "undefined") return "ko";
  const tag = navigator.languages?.[0] ?? navigator.language ?? "ko";
  return resolveUiLocaleFromLanguageTag(tag);
}
