import type { Stage1CollectedData } from "@/lib/stages/stage1/collectFlow";

export type Stage1EditableSlot = "starting_point";

const EDIT_LINE = /EDIT:(starting_point)\|(.+)/i;

const NATURAL_PATTERNS: Array<{
  slot: Stage1EditableSlot;
  pattern: RegExp;
}> = [
  {
    slot: "starting_point",
    pattern:
      /(?:문제(?:점)?|starting_point)(?:을|을)?\s*[:：]?\s*(.+?)(?:으로|로)\s*(?:바꿔|수정)/i,
  },
  { slot: "starting_point", pattern: /(?:문제(?:점)?)\s*[:：]\s*(.+)/i },
];

export function parseCoachEdit(
  userMessage: string,
  coachReply: string,
): Partial<Pick<Stage1CollectedData, "startingPoint">> | null {
  const editMatch = coachReply.match(EDIT_LINE);
  if (editMatch) {
    return applyEditSlot(editMatch[1] as Stage1EditableSlot, editMatch[2] ?? "");
  }

  for (const { slot, pattern } of NATURAL_PATTERNS) {
    const m = userMessage.match(pattern);
    if (m?.[1]) {
      return applyEditSlot(slot, m[1]);
    }
  }

  return null;
}

function applyEditSlot(
  slot: Stage1EditableSlot,
  raw: string,
): Partial<Pick<Stage1CollectedData, "startingPoint">> {
  const value = raw.trim();
  switch (slot) {
    case "starting_point":
      return { startingPoint: value };
  }
}

export function stripEditMetaLine(reply: string): string {
  return reply.replace(/\n?EDIT:(starting_point)\|[^\n]+/gi, "").trim();
}

export const STAGE1_REVIEW_CHAT_HINT = `
사용자는 문제점을 이미 대화로 입력했고 지금 검토 중입니다.
수정이 필요하면 한 줄로 답하고, 필요 시 메타 줄을 붙이세요:
  EDIT:starting_point|수정된 문제점
`.trim();
