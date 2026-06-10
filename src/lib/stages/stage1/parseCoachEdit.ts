import type { Stage1CollectedData } from "@/lib/stages/stage1/collectFlow";

export type Stage1EditableSlot = "starting_point" | "hopes" | "fears";

const EDIT_LINE = /EDIT:(starting_point|hopes|fears)\|(.+)/i;

const USER_PATTERNS: {
  slot: Stage1EditableSlot;
  pattern: RegExp;
}[] = [
  {
    slot: "starting_point",
    pattern: /(?:문제점|출발점)(?:을|을)?\s*[:：]?\s*(.+?)(?:으로|로)\s*(?:바꿔|수정|변경)/,
  },
  { slot: "starting_point", pattern: /(?:문제점|출발점)\s*[:：]\s*(.+)/i },
  { slot: "hopes", pattern: /(?:희망|hope|hopes)(?:을|을)?\s*[:：]?\s*(.+?)(?:으로|로)\s*(?:바꿔|수정)/i },
  { slot: "hopes", pattern: /(?:희망|hope)\s*[:：]\s*(.+)/i },
  { slot: "fears", pattern: /(?:걱정|fear|fears)(?:을|을)?\s*[:：]?\s*(.+?)(?:으로|로)\s*(?:바꿔|수정)/i },
  { slot: "fears", pattern: /(?:걱정|fear)\s*[:：]\s*(.+)/i },
];

export function parseCoachEdit(
  userMessage: string,
  coachReply: string,
): Partial<Pick<Stage1CollectedData, "startingPoint" | "hope" | "fear">> | null {
  const line = coachReply.match(EDIT_LINE);
  if (line) {
    const slot = line[1].toLowerCase() as Stage1EditableSlot;
    const value = line[2].trim();
    if (!value) return null;
    return slotToPatch(slot, value);
  }

  for (const { slot, pattern } of USER_PATTERNS) {
    const m = userMessage.match(pattern);
    if (m?.[1]?.trim()) {
      return slotToPatch(slot, m[1].trim());
    }
  }

  return null;
}

function slotToPatch(
  slot: Stage1EditableSlot,
  value: string,
): Partial<Pick<Stage1CollectedData, "startingPoint" | "hope" | "fear">> {
  switch (slot) {
    case "starting_point":
      return { startingPoint: value };
    case "hopes":
      return { hope: value };
    case "fears":
      return { fear: value };
  }
}

/** 화면에 보여줄 때 EDIT: 메타 줄 제거 */
export function stripEditMetaLine(reply: string): string {
  return reply.replace(/\n?EDIT:(starting_point|hopes|fears)\|[^\n]+/gi, "").trim();
}

export const STAGE1_REVIEW_CHAT_HINT = `
[검토·편집 모드]
사용자는 문제점·Hopes·Fears를 이미 대화로 입력했고 지금 검토 중입니다.
문제점은 사업 계획·솔루션이 아니라 고객이 겪는 문제·상황의 출발점이며, 이후 단계에서 아이디어·컨셉을 순서대로 만든다는 맥락을 유지하세요.
- 한 턴에 질문 하나, 답을 먼저 주지 않음.
- 사용자가 특정 항목 수정을 요청하면 확인 후 응답 맨 마지막 줄에 정확히 한 줄만 추가:
  EDIT:starting_point|수정된 문제점
  EDIT:hopes|수정된 희망
  EDIT:fears|수정된 걱정
- 수정이 없으면 EDIT 줄을 넣지 마세요.
`.trim();
