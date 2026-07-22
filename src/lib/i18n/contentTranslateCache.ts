/**
 * 산출물 표시용 번역 캐시 — sessionStorage + 메모리.
 * DB 원문은 바꾸지 않고, 같은 문장의 재번역만 막는다.
 */

const MEMORY = new Map<string, string>();
const STORAGE_PREFIX = "spotlight-tx:";

function simpleHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(33, h) ^ text.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}

export function translateCacheKey(text: string, target: string): string {
  return `${target}:${simpleHash(text)}:${text.length}`;
}

export function readTranslateCache(text: string, target: string): string | null {
  const key = translateCacheKey(text, target);
  const mem = MEMORY.get(key);
  if (mem) return mem;
  if (typeof sessionStorage === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (stored) {
      MEMORY.set(key, stored);
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeTranslateCache(
  text: string,
  target: string,
  translated: string,
): void {
  const key = translateCacheKey(text, target);
  MEMORY.set(key, translated);
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, translated);
  } catch {
    /* quota */
  }
}

/** 번역 스킵 — 비어 있거나 한글이 거의 없으면 */
export function shouldSkipTranslate(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length < 2) return true;
  // 한글 음절이 없으면 이미 영문/숫자로 가정
  if (!/[가-힣]/.test(t)) return true;
  return false;
}
