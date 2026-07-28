/** Kevin 생성 텍스트에서 (가설) 접두 표기 제거 + 비허용 문자 정제 */
import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";

export function cleanLatentNeedText(text: string): string {
  return sanitizeCoachKoreanText(text.replace(/^\(가설\)\s*/u, "")).trim();
}
