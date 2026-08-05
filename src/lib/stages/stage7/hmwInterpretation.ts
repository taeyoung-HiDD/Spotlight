import type { HmwInterpretation, HmwInterpretationSlot } from "@/lib/stages/stage7/hmwTypes";
import { containsSolutionNoun } from "@/lib/stages/stage7/hmwQualityChecklist";

export type InterpretationSelection = Partial<
  Record<HmwInterpretationSlot, string>
>;

/** 선택한 해석 옵션 id 조합 → stimulusId */
export function buildInterpretationStimulusId(
  selection: InterpretationSelection,
): string {
  return (["who", "object", "outcome", "direction"] as const)
    .filter((slot) => selection[slot]?.trim())
    .map((slot) => `${slot}:${selection[slot]!.trim()}`)
    .join("|");
}

export function parseInterpretationStimulusId(
  stimulusId: string,
): InterpretationSelection {
  const out: InterpretationSelection = {};
  for (const part of stimulusId.split("|")) {
    const [slot, id] = part.split(":");
    if (
      (slot === "who" ||
        slot === "object" ||
        slot === "outcome" ||
        slot === "direction") &&
      id?.trim()
    ) {
      out[slot] = id.trim();
    }
  }
  return out;
}

function optionText(
  interpretations: HmwInterpretation[],
  slot: HmwInterpretationSlot,
  optionId: string | undefined,
): string {
  if (!optionId) return "";
  const row = interpretations.find((i) => i.slot === slot);
  return row?.options.find((o) => o.id === optionId)?.text.trim() ?? "";
}

export type InterpretationSelectionTexts = Partial<
  Record<HmwInterpretationSlot, string>
>;

export function selectionTextsFromIds(
  interpretations: HmwInterpretation[],
  selection: InterpretationSelection,
): InterpretationSelectionTexts {
  return {
    ...(selection.who
      ? { who: optionText(interpretations, "who", selection.who) }
      : {}),
    ...(selection.object
      ? { object: optionText(interpretations, "object", selection.object) }
      : {}),
    ...(selection.outcome
      ? { outcome: optionText(interpretations, "outcome", selection.outcome) }
      : {}),
    ...(selection.direction
      ? {
          direction: optionText(
            interpretations,
            "direction",
            selection.direction,
          ),
        }
      : {}),
  };
}

/** "~하는 것" 등 명사절을 문장 성분에 맞게 짧게 다듬기 */
function softenPhrase(text: string): string {
  return text
    .trim()
    .replace(/이\(가\)|을\(를\)|은\(는\)/gu, "")
    .replace(/\s+/g, " ")
    .replace(/하는\s*것$/u, "함")
    .replace(/되는\s*것$/u, "됨")
    .replace(/인\s*것$/u, "")
    .replace(/인\s*상태$/u, "인 상태")
    .replace(/는\s*것$/u, "")
    .replace(/을\s*것$/u, "")
    .trim();
}

function endsWithHangul(text: string): string | null {
  const m = text.match(/([가-힣])\s*$/u);
  return m?.[1] ?? null;
}

/** 받침 있으면 을, 없으면 를 (근사) */
function objectParticle(text: string): "을" | "를" {
  const ch = endsWithHangul(text);
  if (!ch) return "를";
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "를";
  return code % 28 === 0 ? "를" : "을";
}

function subjectParticle(text: string): "이" | "가" {
  const ch = endsWithHangul(text);
  if (!ch) return "가";
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "가";
  return code % 28 === 0 ? "가" : "이";
}

/**
 * 선택 칩만으로 하위 질문 초안 (미선택 슬롯은 채우지 않음).
 * 최종 문장은 LLM 재작성으로 다듬는 것을 권장.
 */
export function composeInterpretationSubQuestion(
  hmwText: string,
  interpretations: HmwInterpretation[],
  selection: InterpretationSelection,
): string {
  const who = optionText(interpretations, "who", selection.who);
  const object = optionText(interpretations, "object", selection.object);
  const outcome = optionText(interpretations, "outcome", selection.outcome);
  const direction = optionText(
    interpretations,
    "direction",
    selection.direction,
  );

  if (![who, object, outcome, direction].some(Boolean)) return "";

  const whoPart = who
    ? `${softenPhrase(who)}${subjectParticle(softenPhrase(who))} `
    : "";
  const objectSoft = object ? softenPhrase(object) : "";
  const outcomeSoft = outcome ? softenPhrase(outcome) : "";
  const directionSoft = direction ? softenPhrase(direction) : "";

  let body = "";

  if (objectSoft && outcomeSoft && directionSoft) {
    body = `${whoPart}${objectSoft}${objectParticle(objectSoft)} ${directionSoft} ${outcomeSoft}하게`;
  } else if (objectSoft && outcomeSoft) {
    body = `${whoPart}${objectSoft}에서 ${outcomeSoft}${objectParticle(outcomeSoft)} 더 분명히 느끼게`;
  } else if (objectSoft && directionSoft) {
    body = `${whoPart}${objectSoft}${objectParticle(objectSoft)} ${directionSoft} 다루게`;
  } else if (outcomeSoft && directionSoft) {
    body = `${whoPart}${outcomeSoft}${objectParticle(outcomeSoft)} ${directionSoft} 느끼게`;
  } else if (objectSoft) {
    body = `${whoPart}${objectSoft}${objectParticle(objectSoft)} 더 잘 다루게`;
  } else if (outcomeSoft) {
    body = `${whoPart}${outcomeSoft}${objectParticle(outcomeSoft)} 더 잘 느끼게`;
  } else if (directionSoft) {
    body = `${whoPart}원하는 변화를 ${directionSoft} 만들게`;
  } else if (who) {
    body = `${whoPart}이 질문의 핵심을 더 구체적으로 다루게`;
  }

  const draft = `어떻게 하면 ${body} 할 수 있을까?`.replace(/\s+/g, " ").trim();

  if (containsSolutionNoun(draft)) {
    return hmwText.trim() || draft;
  }
  return draft;
}

export function collectSelectionLines(
  interpretations: HmwInterpretation[],
  selection: InterpretationSelection,
): Array<{ slot: HmwInterpretationSlot; slotLabel: string; text: string }> {
  const lines: Array<{
    slot: HmwInterpretationSlot;
    slotLabel: string;
    text: string;
  }> = [];
  for (const slot of ["who", "object", "outcome", "direction"] as const) {
    const id = selection[slot];
    if (!id) continue;
    const row = interpretations.find((i) => i.slot === slot);
    const text = row?.options.find((o) => o.id === id)?.text.trim() ?? "";
    if (!text) continue;
    lines.push({
      slot,
      slotLabel: row?.slotLabel ?? `${slot}이란?`,
      text,
    });
  }
  return lines;
}

export function stripSolutionNounOptions(
  interpretations: HmwInterpretation[],
): HmwInterpretation[] {
  return interpretations
    .map((row) => ({
      ...row,
      options: row.options.filter(
        (o) => o.text.trim() && !containsSolutionNoun(o.text),
      ),
    }))
    .filter((row) => row.options.length > 0);
}

function createOptionId(slot: HmwInterpretationSlot, index: number): string {
  return `${slot}-${index + 1}`;
}

/** LLM 실패 시 — 해결책 없이 거친 슬롯 갈래 */
export function heuristicHmwInterpretations(input: {
  hmwText: string;
  subjectName?: string;
  latentNeedText?: string;
}): HmwInterpretation[] {
  const hmw = input.hmwText.trim();
  const subject = input.subjectName?.trim() || "당사자";
  const rows: HmwInterpretation[] = [];

  rows.push({
    slot: "who",
    slotLabel: "누구란?",
    options: [
      { id: createOptionId("who", 0), text: `이제 막 시작한 ${subject}` },
      { id: createOptionId("who", 1), text: `경험이 쌓인 ${subject}` },
      { id: createOptionId("who", 2), text: `혼자 모든 걸 챙기는 ${subject}` },
    ].filter((o) => !containsSolutionNoun(o.text)),
  });

  const objectLabel = /번\s*돈|매출|수입|돈/u.test(hmw)
    ? "번 돈이란?"
    : /재고/u.test(hmw)
      ? "재고란?"
      : "무엇이란?";
  const objectOpts = /번\s*돈|매출|수입|돈/u.test(hmw)
    ? ["총매출", "순이익", "시간당으로 환산한 가치"]
    : /재고/u.test(hmw)
      ? ["지금 매대에 있는 양", "곧 떨어질 품목", "놓친 판매 기회"]
      : ["눈에 보이는 결과", "과정에서 드는 노력", "주변 사람의 반응"];

  rows.push({
    slot: "object",
    slotLabel: objectLabel,
    options: objectOpts.slice(0, 3).map((text, i) => ({
      id: createOptionId("object", i),
      text,
    })),
  });

  const outcomeMatch = hmw.match(
    /에\s*대한\s*([가-힣A-Za-z0-9]{2,12})|([가-힣]{2,8})을\s*더|([가-힣]{2,8})를\s*더/u,
  );
  const outcomeWord =
    outcomeMatch?.[1] || outcomeMatch?.[2] || outcomeMatch?.[3] || "원하는 느낌";
  rows.push({
    slot: "outcome",
    slotLabel: `${outcomeWord}이란?`,
    options: [
      { id: createOptionId("outcome", 0), text: "성취를 바로 알아차리는 것" },
      { id: createOptionId("outcome", 1), text: "이전보다 성장했다고 실감하는 것" },
      { id: createOptionId("outcome", 2), text: "주변으로부터 인정받는 것" },
    ].filter((o) => !containsSolutionNoun(o.text)),
  });

  rows.push({
    slot: "direction",
    slotLabel: /키우|높이|늘리/u.test(hmw) ? "키운다란?" : "어느 방향이란?",
    options: [
      { id: createOptionId("direction", 0), text: "더 자주" },
      { id: createOptionId("direction", 1), text: "더 강하게" },
      { id: createOptionId("direction", 2), text: "더 오래" },
    ],
  });

  return stripSolutionNounOptions(rows).map((row) => ({
    ...row,
    options: row.options.slice(0, 3),
  }));
}
