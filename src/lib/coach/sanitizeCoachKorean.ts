/**
 * 코치·사전 조사 AI 출력에서 중국어 한자·비표준 용어를 한국어 워크북 라벨로 정규화.
 */

import { COACH_EMPATHY_MAP_STRUCTURE_RULE } from "@/lib/coach/empathyMapCoachRules";

const PHRASE_REPLACEMENTS: [RegExp, string][] = [
  [/思考\s*\(\s*Thinking\s*\)/gi, "생각함(Thinks)"],
  [/思考\s*\(\s*THINKS?\s*\)/gi, "생각함(Thinks)"],
  [/思考/g, "생각함"],
  [/说话\s*\(\s*Quote\s*\)/gi, "말함(Says)"],
  [/说话/g, "말함"],
  [/感觉\s*\(\s*Feels?\s*\)/gi, "느낌(Feels)"],
  [/感觉/g, "느낌"],
  [/行为\s*\(\s*Does?\s*\)/gi, "행동함(Does)"],
  [/行为/g, "행동함"],
  [/所说的话/g, "말한 것"],
  [/所说/g, "말함"],
  [/引用/g, "인용"],
  [/日记/g, "다이어리"],
  [/用户/g, "사용자"],
  [/创业者/g, "예비 창업자"],
  [/创业/g, "창업"],
  [/问题/g, "문제"],
  [/挑战/g, "도전"],
  [/技能/g, "스킬"],
  [/成功/g, "성공"],
  [/资金/g, "자금"],
  [/말하기\s*\(\s*Quote\s*\)/gi, "말함(Says)"],
  [/말하기\s*\(\s*SAYS?\s*\)/gi, "말함(Says)"],
  [/말하기/g, "말함"],
  [/생각하기\s*\(\s*Thinking\s*\)/gi, "생각함(Thinks)"],
  [/생각하기\s*\(\s*THINKS?\s*\)/gi, "생각함(Thinks)"],
  [/감정\s*\(\s*Feelings?\s*\)/gi, "느낌(Feels)"],
  [/감정\s*\(\s*FEELS?\s*\)/gi, "느낌(Feels)"],
  [/행동\s*\(\s*Doing\s*\)/gi, "행동함(Does)"],
  [/행동\s*\(\s*DOES?\s*\)/gi, "행동함(Does)"],
  [/Quote\s*\(\s*말(?:함|하기)\s*\)/gi, "말함(Says)"],
  [/Thinking\s*\(\s*생각(?:함|하기)\s*\)/gi, "생각함(Thinks)"],
  [/^Quote$/gim, "말함(Says)"],
  [/^Thinking$/gim, "생각함(Thinks)"],
  [/^Says$/gim, "말함(Says)"],
  [/^Thinks$/gim, "생각함(Thinks)"],
  [/^Does$/gim, "행동함(Does)"],
  [/^Feels?$/gim, "느낌(Feels)"],
  [/^Feeling$/gim, "느낌(Feels)"],
  [/^Doing$/gim, "행동함(Does)"],
  [/느낌함\s*\(\s*Feels?\s*\)/gi, "느낌(Feels)"],
  [/느낌함/g, "느낌"],
];

const VALID_EMPATHY_QUADRANT_HEADER =
  /^(?:말함|생각함|행동함|느낌)\s*(?:\(\s*(?:Says|Thinks|Does|Feels)\s*\))?/i;

const INVALID_EMPATHY_QUADRANT_HEADER =
  /^(?:고민|희망|Pains?|Gains?|Jobs?(?:\s*to\s*be\s*done)?)\s*(?:\([^)]*\))?/i;

/** 공감맵·Diary Studies 섹션 제목 — 한국어 + 영문 칩 */
export const COACH_KOREAN_LABEL_RULE = `
- 모든 문장·제목·불릿은 **한국어(한글)** 로만 작성하세요. 중국어·일본어 한자(思考·说话·感觉·行为 등)는 절대 쓰지 마세요.
- 공감맵 예시 섹션 제목은 반드시 아래 네 가지만 사용하세요:
  말함(Says) · 생각함(Thinks) · 행동함(Does) · 느낌(Feels)
- 고민(Pain)·희망(Gain)·감정(Feeling)·행동(Doing) 등 다른 프레임워크 제목은 금지입니다.`.trim();

export const COACH_EMPATHY_MAP_PROMPT_RULE = `${COACH_KOREAN_LABEL_RULE}\n\n${COACH_EMPATHY_MAP_STRUCTURE_RULE}`;

function stripInvalidEmpathyMapSections(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!skipping) out.push(line);
      continue;
    }

    if (INVALID_EMPATHY_QUADRANT_HEADER.test(trimmed)) {
      skipping = true;
      continue;
    }

    if (skipping && VALID_EMPATHY_QUADRANT_HEADER.test(trimmed)) {
      skipping = false;
      out.push(line);
      continue;
    }

    if (!skipping) out.push(line);
  }

  return out.join("\n");
}

export function sanitizeCoachKoreanText(text: string): string {
  if (!text.trim()) return text;

  let out = text;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return stripInvalidEmpathyMapSections(out);
}
