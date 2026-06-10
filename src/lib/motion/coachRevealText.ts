import { MOTION } from "@/lib/motion/timings";

/** Kevin 발화 · 글자(문자) 단위 순차 표시 */
export function tokenizeRevealUnits(text: string): string[] {
  if (!text) return [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    // 사용자 체감상 "타이핑"처럼 보이려면 단어가 아닌 글자 단위가 더 자연스럽다.
    const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }

  return Array.from(text);
}

export function delayForRevealUnit(unit: string): number {
  if (/^\s+$/.test(unit)) return MOTION.coachRevealSpaceMs;
  return MOTION.coachRevealTokenMs;
}
