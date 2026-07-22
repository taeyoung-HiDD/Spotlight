import {
  getMultidisciplinaryExpert,
  MULTIDISCIPLINARY_EXPERTS,
  stripFacilitatorPhrasesFromExpertText,
  type MultidisciplinaryExpertDef,
  type MultidisciplinaryExpertId,
  type MultidisciplinaryExpertInsight,
} from "@/lib/stages/stage4/multidisciplinaryAnalysis";

/** 코치 라이브 턴에 넣을 화자 단위 메시지 */
export interface CoachSpeakerTurnPayload {
  speaker: "kevin" | "expert";
  text: string;
  expertId?: MultidisciplinaryExpertId;
  expertLabelKo?: string;
  expertLabelEn?: string;
  lens?: string;
}

export type CoachMessageHandlerResult =
  | string
  | {
      /** Kevin 단일 답 (turns 없을 때) */
      reply?: string;
      /** Kevin + 전문가 순차 말풍선 */
      turns?: CoachSpeakerTurnPayload[];
    }
  | null
  | undefined;

export function normalizeCoachMessageResult(
  result: CoachMessageHandlerResult,
): CoachSpeakerTurnPayload[] {
  if (result == null) return [];
  if (typeof result === "string") {
    const text = result.trim();
    return text ? [{ speaker: "kevin", text }] : [];
  }
  if (result.turns?.length) {
    return result.turns
      .map((t) => ({
        ...t,
        text: t.text.trim(),
      }))
      .filter((t) => t.text);
  }
  const reply = result.reply?.trim();
  return reply ? [{ speaker: "kevin", text: reply }] : [];
}

export function isMultidisciplinaryAnalysisRequest(message: string): boolean {
  const t = message.trim().toLowerCase();
  if (!t) return false;
  return (
    /다학제/.test(t) ||
    /멀티\s*디스/.test(t) ||
    /multi[\s-]*disciplin/.test(t) ||
    /전문가\s*(분석|해설|의견)/.test(t) ||
    /분석\s*(해\s*줘|부탁|요청)/.test(t) ||
    /전문가들?\s*(불러|초대|모셔)/.test(t)
  );
}

export function resolveAddressedExpert(
  message: string,
  allowedIds?: MultidisciplinaryExpertId[],
): MultidisciplinaryExpertDef | null {
  const pool = allowedIds?.length
    ? MULTIDISCIPLINARY_EXPERTS.filter((e) => allowedIds.includes(e.id))
    : MULTIDISCIPLINARY_EXPERTS;

  const t = message.trim();
  if (!t) return null;

  for (const expert of pool) {
    const ko = expert.labelKo;
    const en = expert.labelEn;
    const patterns = [
      new RegExp(`${ko}\\s*님?`),
      new RegExp(`${en}`, "i"),
      new RegExp(`@\\s*${ko}`),
      new RegExp(`@\\s*${en}`, "i"),
    ];
    if (patterns.some((p) => p.test(t))) return expert;
  }
  return null;
}

export function insightToSpeakerTurn(
  insight: MultidisciplinaryExpertInsight,
): CoachSpeakerTurnPayload {
  const def = getMultidisciplinaryExpert(insight.expertId);
  return {
    speaker: "expert",
    text: stripFacilitatorPhrasesFromExpertText(insight.analysis),
    expertId: insight.expertId,
    expertLabelKo: insight.expertLabelKo || def?.labelKo,
    expertLabelEn: insight.expertLabelEn || def?.labelEn,
    lens: insight.lens || def?.lens,
  };
}

export function buildExpertChoicePrompt(
  experts: MultidisciplinaryExpertDef[],
): string {
  if (!experts.length) {
    return "먼저 「다학제적 분석」을 요청해 주시면, 전문가들을 불러올게요.";
  }
  const list = experts
    .map((e) => `· ${e.labelKo} (${e.labelEn})`)
    .join("\n");
  return `어느 전문가에게 이어서 물어볼까요? 이름이나 「○○님」으로 불러 주세요.\n\n${list}`;
}
