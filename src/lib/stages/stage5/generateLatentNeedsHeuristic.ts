/**
 * 과거 휴리스틱 폴백이 저장한 뭉뚱그린 템플릿 잠재 니즈인지 감지.
 * (예: "…뒤에, 아직 말로 드러나지 않은 욕구·불편이 있을 수 있어요.")
 * 감지되면 진입 시 Need Statement 형식으로 다시 생성합니다.
 */
export function isTemplateLatentNeedText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    trimmed.includes("드러나지 않은 욕구·불편") ||
    trimmed.includes("더 깊은 욕구·불편이 있을 수 있어요")
  );
}
