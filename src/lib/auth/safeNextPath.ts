/** 오픈 리다이렉트 방지 — 앱 내부 상대 경로만 허용 */
export function safeNextPath(raw: string | null | undefined, fallback = "/home"): string {
  const next = raw?.trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}
