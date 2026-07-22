import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";

const SENTENCE_CHUNK_RE = /[^.?!？…]+[.?!？…]+|[^.?!？…]+$/g;

/** 할 일 중심 — 인트로 말풍선 본문을 최대 N문장으로 자름 */
export function truncateToMaxSentences(text: string, max: number): string {
  if (max <= 0) return text.trim();
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const sentences =
    trimmed.match(SENTENCE_CHUNK_RE)?.map((s) => s.trim()).filter(Boolean) ??
    [trimmed];
  return sentences.slice(0, max).join(" ").trim();
}

function bubblePlainText(content: CoachDialogItem["content"]): string | null {
  if (typeof content !== "string") return null;
  return content.replace(/\s*\n+\s*/g, " ").trim();
}

/**
 * 할 일 중심 — 단계 진입 코치 인트로를 한 말풍선·최대 2문장으로 축약.
 * highlight·다중 말풍선은 제거하고 첫 bubble 본문만 사용합니다.
 */
export function briefCoachIntroForTaskFocus(
  items: CoachDialogItem[],
  taskFocused: boolean,
  maxSentences = 2,
): CoachDialogItem[] {
  if (!taskFocused || items.length === 0) return items;

  const bubbles = items.filter((item) => item.type === "bubble");
  if (!bubbles.length) return [];

  const mergedText = bubbles
    .map((b) => bubblePlainText(b.content))
    .filter((t): t is string => Boolean(t))
    .join(" ");

  const first = bubbles[0]!;
  if (!mergedText) {
    return [first];
  }

  return [
    {
      type: "bubble",
      variant: first.variant,
      content: truncateToMaxSentences(mergedText, maxSentences),
    },
  ];
}
