/**
 * 실제 내용으로 채워지지 않은 뭉뚱그린·형식 그대로의 잠재 니즈 텍스트 감지.
 * - 과거 휴리스틱 폴백 문구 (예: "…뒤에, 아직 말로 드러나지 않은 욕구·불편이 있을 수 있어요.")
 * - AI가 프롬프트의 Need Statement 형식 설명(〈궁극적 이유·얻으려는 가치〉 등)을
 *   실제 내용 대신 그대로 되풀이한 경우
 * 감지되면 진입 시 다시 생성해 교체합니다.
 */
export function isTemplateLatentNeedText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (
    trimmed.includes("드러나지 않은 욕구·불편") ||
    trimmed.includes("더 깊은 욕구·불편이 있을 수 있어요")
  ) {
    return true;
  }
  // 각괄호(〈 〉)로 감싼 형식 표기가 그대로 남아 있으면 미완성 템플릿
  if (/[〈《][^〉》]{0,20}[〉》]/u.test(trimmed)) return true;
  // 형식 설명에 쓰인 메타 문구 자체가 니즈로 나온 경우
  if (
    trimmed.includes("궁극적 이유") ||
    trimmed.includes("가치 달성을 위한 행위") ||
    trimmed.includes("얻으려는 가치")
  ) {
    return true;
  }
  return false;
}
