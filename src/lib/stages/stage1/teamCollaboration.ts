/** 팀 협업 의향 — 자연어 yes/no */
const TEAM_YES =
  /^(네|넵|예|응|맞아|좋아|할게|하고\s*싶|같이|함께|팀|초대|불러|같이\s*할)/i;
/** 단독 거절만 — 「아니요 이름 다시」 등은 제외 */
const TEAM_NO_STANDALONE = /^(아니요?|아뇨)[\s,.!…]*$/i;
const TEAM_SOLO =
  /혼자\s*(할|진행)|나중에?\s*할|필요\s*없|안\s*할게|싶지\s*않|skip/i;
const CONTINUE =
  /^(계속|다음|넘어|초대\s*보냈|링크\s*보냈|보냈어|완료|ok|okay)/i;

export type TeamCollaborationChoice = "yes" | "no" | "continue" | null;

/** 프로젝트 이름(제목)을 다시 정하려는 의도 */
export function wantsProjectNameRevision(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/프로젝트\s*이름|프로젝트\s*제목|제목\s*(을|를)?\s*(다시|바꿀|수정|고칠)/i.test(t)) {
    return true;
  }
  if (/이름\s*(을|를)?\s*(다시|바꿀|수정|고칠|정할)/i.test(t)) return true;
  if (/잘못\s*(입력|적|썼|넣)/i.test(t)) return true;
  if (/다시\s*정(할|하)/i.test(t) && /이름|제목|프로젝트/.test(t)) return true;
  return false;
}

export function parseTeamCollaborationChoice(text: string): TeamCollaborationChoice {
  const t = text.trim();
  if (!t) return null;
  if (wantsProjectNameRevision(t)) return null;
  if (CONTINUE.test(t)) return "continue";
  if (TEAM_NO_STANDALONE.test(t) || TEAM_SOLO.test(t)) return "no";
  if (TEAM_YES.test(t)) return "yes";
  return null;
}
