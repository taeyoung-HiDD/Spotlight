/** 페르소나 자동 썸네일 — 이름·상황 시드 기반 DiceBear PNG */

function personaSeed(name: string, situationRaw: string): string {
  const n = name.trim().slice(0, 40);
  const r = situationRaw.trim().slice(0, 200);
  let h = 5381;
  const s = `${n}|${r}`;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(33, h) ^ s.charCodeAt(i);
  }
  const id = `${n.slice(0, 12)}-${Math.abs(h).toString(36)}`;
  return id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
}

/** 자동 생성 썸네일 URL 갱신 허용 여부 (DiceBear)·비어 있음 */
export function isPersonaThumbnailAutoManaged(url: string): boolean {
  const u = url.trim();
  return u.length === 0 || u.includes("api.dicebear.com");
}

export function personaDicebearPngUrl(
  name: string,
  situationRaw: string,
  size = 128,
): string {
  const seed = personaSeed(name, situationRaw);
  const q = new URLSearchParams({
    seed,
    size: String(size),
  });
  return `https://api.dicebear.com/9.x/notionists/png?${q.toString()}`;
}

/** Gemini 없을 때 표시용 짧은 줄 (과도하게 길면 자름) */
export function heuristicPersonaSummary(situationRaw: string): string {
  let t = situationRaw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "");
  if (!t) return "";
  const firstSentence = t.match(/^[^.!?。]{1,80}[.!?。]?/);
  const candidate = firstSentence?.[0]?.trim() ?? t;
  if (candidate.length <= 28) return candidate;
  if (t.length <= 24) return t;
  const cut = t.slice(0, 22).trimEnd();
  return cut.endsWith("…") ? cut : `${cut}…`;
}
