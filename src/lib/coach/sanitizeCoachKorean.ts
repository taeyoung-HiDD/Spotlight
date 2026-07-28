/**
 * 코치·사전 조사 AI 출력에서 중국어·한자·비표준 용어를 한국어 워크북 라벨로 정규화.
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

/** AI가 자주 섞어 쓰는 한자·간체 → 한글 (긴 것부터) */
const HANJA_TO_HANGUL: [string, string][] = [
  ["生活", "생활"],
  ["環境", "환경"],
  ["环境", "환경"],
  ["經驗", "경험"],
  ["経験", "경험"],
  ["经验", "경험"],
  ["觀察", "관찰"],
  ["観察", "관찰"],
  ["观察", "관찰"],
  ["時間", "시간"],
  ["时间", "시간"],
  ["問題", "문제"],
  ["金融", "금융"],
  ["資産", "자산"],
  ["资产", "자산"],
  ["管理", "관리"],
  ["形成", "형성"],
  ["理解", "이해"],
  ["個人", "개인"],
  ["个人", "개인"],
  ["實際", "실제"],
  ["实际", "실제"],
  ["服務", "서비스"],
  ["服务", "서비스"],
  ["使用", "사용"],
  ["方法", "방법"],
  ["必要", "필요"],
  ["調査", "조사"],
  ["调查", "조사"],
  ["對象", "대상"],
  ["对象", "대상"],
  ["行動", "행동"],
  ["行动", "행동"],
  ["感覺", "느낌"],
  ["感情", "감정"],
  ["思考", "생각"],
  ["用戶", "사용자"],
  ["顧客", "고객"],
  ["顾客", "고객"],
  ["市場", "시장"],
  ["市场", "시장"],
  ["課題", "과제"],
  ["機會", "기회"],
  ["机会", "기회"],
  ["目標", "목표"],
  ["目标", "목표"],
  ["情況", "상황"],
  ["情况", "상황"],
  ["過程", "과정"],
  ["过程", "과정"],
  ["結果", "결과"],
  ["结果", "결과"],
  ["重要", "중요"],
  ["直接", "직접"],
  ["體驗", "체험"],
  ["体验", "체험"],
  ["自我", "자아"],
];

/** 히라가나·가타카나·CJK 한자·키릴·아랍·그리스 등 (한글·영문·숫자·기본 문장부호는 유지) */
const NON_KO_EN_SCRIPT =
  /[\u0370-\u03FF\u0400-\u04FF\u0500-\u052F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u2DE0-\u2DFF\uA640-\uA69F]/g;

const VALID_EMPATHY_QUADRANT_HEADER =
  /^(?:말함|생각함|행동함|느낌)\s*(?:\(\s*(?:Says|Thinks|Does|Feels)\s*\))?/i;

const INVALID_EMPATHY_QUADRANT_HEADER =
  /^(?:고민|희망|Pains?|Gains?|Jobs?(?:\s*to\s*be\s*done)?)\s*(?:\([^)]*\))?/i;

/** 허용되지 않는 문자(한자·키릴 등)가 포함돼 있는지 — 잠재 니즈 재생성 판단용 */
export function hasDisallowedForeignScript(text: string): boolean {
  return /[\u0370-\u03FF\u0400-\u04FF\u0500-\u052F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u2DE0-\u2DFF\uA640-\uA69F]/.test(
    text,
  );
}

/** 공감맵·Diary Studies 섹션 제목 — 한국어 + 영문 칩 */
export const COACH_KOREAN_LABEL_RULE = `
- 모든 문장·제목·불릿은 **한국어(한글) 또는 영어**만 사용하세요. 한자·중국어·일본어·러시아어(키릴)·아랍어 등 다른 문자(生活·思考·говорить·финансовую 등)는 절대 쓰지 마세요. 예: 生活 → 생활, 環境 → 환경.
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

function replaceCommonHanja(text: string): string {
  let out = text;
  for (const [hanja, hangul] of HANJA_TO_HANGUL) {
    if (out.includes(hanja)) out = out.split(hanja).join(hangul);
  }
  return out;
}

function stripForeignScripts(text: string): string {
  return text
    .replace(NON_KO_EN_SCRIPT, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ?\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function sanitizeCoachKoreanText(text: string): string {
  if (!text.trim()) return text;

  let out = text;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  out = replaceCommonHanja(out);
  out = stripForeignScripts(out);
  return stripInvalidEmpathyMapSections(out);
}
