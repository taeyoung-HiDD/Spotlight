/**
 * 실제 내용으로 채워지지 않은·잘못된 언어의 잠재 니즈 텍스트 감지.
 * - 과거 휴리스틱 폴백 문구
 * - AI가 형식 설명을 그대로 되풀이한 경우
 * - 러시아어(키릴) 등 비허용 문자
 * - 한글이 없는 문장 (한국어 우선 산출 — 영어 용어만인 문장 포함)
 * 감지되면 진입 시 다시 생성해 교체합니다.
 */
import { hasDisallowedForeignScript } from "@/lib/coach/sanitizeCoachKorean";

const HANGUL = /[\uac00-\ud7a3]/;

export function isTemplateLatentNeedText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (hasDisallowedForeignScript(trimmed)) return true;
  // Need Statement는 한글이 본문이어야 함 (영어 용어만 잔뜩인 문장 거부)
  if (!HANGUL.test(trimmed)) return true;
  if (
    trimmed.includes("드러나지 않은 욕구·불편") ||
    trimmed.includes("더 깊은 욕구·불편이 있을 수 있어요")
  ) {
    return true;
  }
  if (/[〈《][^〉》]{0,20}[〉》]/u.test(trimmed)) return true;
  if (
    trimmed.includes("궁극적 이유") ||
    trimmed.includes("가치 달성을 위한 행위") ||
    trimmed.includes("얻으려는 가치")
  ) {
    return true;
  }
  return false;
}
