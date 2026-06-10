import {
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme/constants";

export function isValidThemePreference(value: string): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isValidThemePreference(stored)) return stored;
  } catch {
    /* private mode 등 */
  }
  return "system";
}

export function resolveDarkMode(preference: ThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** html 클래스·data-theme 동기화 */
export function applyThemePreference(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = resolveDarkMode(preference);
  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", preference);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function persistThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  applyThemePreference(preference);
}

/** layout 인라인 스크립트용 — hydration 전 플래시 방지 */
export function themeBootstrapScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k)||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.setAttribute('data-theme',t);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
}
