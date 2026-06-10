export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "spotlight-theme";

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  system: "시스템",
  light: "라이트",
  dark: "다크",
};
