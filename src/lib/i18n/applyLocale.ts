import {
  UI_LOCALE_STORAGE_KEY,
  isValidUiLocale,
} from "@/lib/i18n/constants";
import {
  type UiLocale,
  resolveUiLocaleFromNavigator,
} from "@/lib/i18n/uiLocale";

export function readStoredUiLocale(): UiLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(UI_LOCALE_STORAGE_KEY);
    if (stored && isValidUiLocale(stored)) return stored;
  } catch {
    /* private mode 등 */
  }
  return null;
}

/** 저장된 값 → 없으면 navigator → ko */
export function resolveInitialUiLocale(): UiLocale {
  return readStoredUiLocale() ?? resolveUiLocaleFromNavigator();
}

export function applyDocumentLang(locale: UiLocale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "en" ? "en" : "ko";
  document.documentElement.setAttribute("data-ui-locale", locale);
}

export function persistUiLocale(locale: UiLocale): void {
  try {
    localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  applyDocumentLang(locale);
}

/** layout 인라인 스크립트용 — hydration 전 lang 플래시 방지 */
export function localeBootstrapScript(): string {
  return `(function(){try{var k=${JSON.stringify(UI_LOCALE_STORAGE_KEY)};var t=localStorage.getItem(k);var l=(t==='en'||t==='ko')?t:(navigator.language||'').toLowerCase().indexOf('ko')===0?'ko':'en';var r=document.documentElement;r.lang=l==='en'?'en':'ko';r.setAttribute('data-ui-locale',l);}catch(e){}})();`;
}
