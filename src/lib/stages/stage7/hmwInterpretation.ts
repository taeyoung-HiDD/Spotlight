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

/** 선택 칩으로 하위 질문 미리보기 (해결책 없이 문제만 좁힘) */
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

  const parts = [who, object, outcome, direction].filter(Boolean);
  if (parts.length === 0) return "";

  const subject = who || "그 사람이";
  const target = object ? `${object}에 대해 ` : "";
  const feeling = outcome || "원하는 결과";
  const change = direction || "더 잘 이루게";

  const draft = `어떻게 하면 ${subject} ${target}${feeling}을(를) ${change} 할 수 있을까?`
    .replace(/\s+/g, " ")
    .trim();

  if (containsSolutionNoun(draft)) {
    return hmwText.trim() || draft;
  }
  return draft;
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
