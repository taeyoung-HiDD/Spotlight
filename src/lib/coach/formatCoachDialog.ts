/**
 * Kevin 발화 가독성 — 문장·문단 사이 빈 줄(숨 쉴 틈)
 */

import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";

/** UI에 마크다운 `**`가 그대로 보이지 않도록 제거 */
export function stripCoachMarkdownMarkers(text: string): string {
  return text.replace(/\*\*/g, "");
}

const SENTENCE_END = /(?<=[.?!？…]["'」』)]?)(?=\s+[^\s「/])/u;

function splitIntoSentences(paragraph: string): string[] {
  const trimmed = paragraph.trim();
  if (!trimmed) return [];
  if (!SENTENCE_END.test(trimmed)) return [trimmed];
  return trimmed
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter(Boolean);
}

function paragraphize(block: string): string[] {
  const trimmed = block.trim();
  if (!trimmed) return [];

  if (trimmed.includes("\n\n")) {
    return trimmed
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  if (trimmed.includes("\n")) {
    return trimmed
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  const sentences = splitIntoSentences(trimmed);
  if (sentences.length <= 1) return [trimmed];
  return sentences;
}

/** 코치 말풍선·타이핑 텍스트에 문단 줄바꿈 적용 */
export function formatCoachDialogBreaks(text: string): string {
  const raw = stripCoachMarkdownMarkers(
    sanitizeCoachKoreanText(text.replace(/\r\n/g, "\n")),
  ).trim();
  if (!raw) return raw;

  const exampleIdx = raw.search(/\n\n예를 들어/);
  let main = raw;
  let exampleTail = "";
  if (exampleIdx >= 0) {
    main = raw.slice(0, exampleIdx).trim();
    exampleTail = raw.slice(exampleIdx + 2).trim();
  }

  const paragraphs = paragraphize(main);
  if (exampleTail) paragraphs.push(exampleTail);

  return paragraphs.join("\n\n").replace(/\n{3,}/g, "\n\n");
}

/** 질문 + 예시 칩 안내 (대화 스크립트 공통) */
export function coachAskWithExamples(
  question: string,
  examples: string[],
  tail = "처럼 답해 주셔도 돼요.",
): string {
  const samples = examples
    .slice(0, 3)
    .map((e) => `「${e}」`)
    .join(" / ");
  return formatCoachDialogBreaks(
    `${question.trim()}\n\n예를 들어 — ${samples} ${tail}`,
  );
}
