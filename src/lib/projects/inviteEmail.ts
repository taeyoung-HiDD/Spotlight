/** 초대 입력란 — 쉼표·줄바꿈·세미콜론 구분 이메일 파싱 */
export function parseInviteEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export function buildInviteMailtoUrl(
  emails: string[],
  inviteUrl: string,
  projectTitle: string,
): string {
  const title = projectTitle.trim() || "프로젝트";
  const subject = encodeURIComponent(`「${title}」 프로젝트 초대`);
  const body = encodeURIComponent(
    [
      "안녕하세요,",
      "",
      `「${title}」 프로젝트에 초대합니다.`,
      "",
      "아래 링크에서 로그인한 뒤 「참여 수락」을 눌러 주세요.",
      inviteUrl,
      "",
      "링크는 30일 동안 유효해요.",
    ].join("\n"),
  );
  return `mailto:${emails.join(",")}?subject=${subject}&body=${body}`;
}
