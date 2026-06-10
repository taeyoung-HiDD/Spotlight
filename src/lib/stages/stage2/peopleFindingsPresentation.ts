/** 사람 영역(주 사용자·이해 관계자) 캔버스 표시 스타일 */

export type PeopleSectionVariant = "profile" | "role" | "connection" | "default";

export function getPeopleSectionVariant(title: string): PeopleSectionVariant {
  if (/누구인지|프로필/u.test(title)) return "profile";
  if (/특성|행태|역할|영향/u.test(title)) return "role";
  if (/문제.*연결|문제.*관계|문제.*경험/u.test(title)) return "connection";
  return "default";
}

export type ParsedProfileItem = {
  segment: string;
  identity: string;
  body: string;
  raw: string;
};

/** 「세그먼트 (정체성)」: 설명 형태 파싱 */
export function parseProfileItem(item: string): ParsedProfileItem {
  const raw = item.trim();
  const colon = raw.indexOf(":");
  const head = colon > 0 ? raw.slice(0, colon).trim() : raw;
  const body = colon > 0 ? raw.slice(colon + 1).trim() : "";

  const paren = head.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    return {
      segment: paren[1]!.trim(),
      identity: paren[2]!.trim(),
      body: body || raw,
      raw,
    };
  }

  const dash = head.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  if (dash) {
    return {
      segment: dash[1]!.trim(),
      identity: dash[2]!.trim(),
      body: body || raw,
      raw,
    };
  }

  return {
    segment: head,
    identity: "",
    body: body || raw,
    raw,
  };
}

export function parseRoleItem(item: string): { subject: string; detail: string } {
  const raw = item.trim();
  const colon = raw.indexOf(":");
  if (colon > 0 && colon < 40) {
    return {
      subject: raw.slice(0, colon).trim(),
      detail: raw.slice(colon + 1).trim(),
    };
  }
  const isMatch = raw.match(/^(.{2,28}?)(?:은|는|이|가)\s+(.+)$/);
  if (isMatch) {
    return { subject: isMatch[1]!.trim(), detail: isMatch[2]!.trim() };
  }
  return { subject: "", detail: raw };
}

export const PEOPLE_SECTION_HEADER_CLASS: Record<PeopleSectionVariant, string> = {
  profile:
    "border-l-[3px] border-white/40 pl-2.5 text-[12.5px] font-bold tracking-wide text-zone-cell-fg sm:text-[14px]",
  role: "border-l-[3px] border-white/25 pl-2.5 text-[12.5px] font-bold text-zone-cell-fg sm:text-[14px]",
  connection:
    "border-l-[3px] border-white/30 pl-2.5 text-[12.5px] font-bold text-zone-cell-fg-muted sm:text-[14px]",
  default:
    "text-[11.5px] font-semibold tracking-wide text-zone-cell-fg-muted uppercase sm:text-[12.5px]",
};

export const PEOPLE_PROFILE_CARD_CLASS =
  "rounded-lg border border-white/12 bg-white/5 px-3 py-2.5";

export const PEOPLE_ROLE_CARD_CLASS =
  "rounded-md border border-white/10 bg-white/5 px-2.5 py-2";
