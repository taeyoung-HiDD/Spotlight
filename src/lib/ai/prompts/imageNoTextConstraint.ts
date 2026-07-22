/** 모든 AI 이미지 생성 프롬프트 끝에 강제 결합 — 이미지 내 텍스트·한글 깨짐 방지 */
export const IMAGE_NO_TEXT_CONSTRAINT =
  "CRITICAL: Do not include any text, typography, labels, placeholder field names, or unreadable gibberish characters inside the image. Do not draw title bars, description areas, HMW fields, or annotated empty slots. Keep the focus entirely on the pure visual scene, icons, and wordless layout on a white background.";

/** 아이디어 스케치 전용 — 플레이스홀더 라벨 반복 금지 */
export const IDEA_SKETCH_NO_TEXT_CONSTRAINT =
  'CRITICAL: The image must contain ZERO readable characters. Never paint "IDEA TITLE", "IDEA DESCRIPTION", "HMW", chart labels, or button text. Reference metadata stays outside the image.';

export function appendImageNoTextConstraint(prompt: string): string {
  const base = prompt.trim();
  if (!base) return IMAGE_NO_TEXT_CONSTRAINT;
  let result = base;
  if (!result.includes(IMAGE_NO_TEXT_CONSTRAINT)) {
    result = `${result}\n\n${IMAGE_NO_TEXT_CONSTRAINT}`;
  }
  if (
    result.includes("REFERENCE CONTEXT") &&
    !result.includes(IDEA_SKETCH_NO_TEXT_CONSTRAINT)
  ) {
    result = `${result}\n\n${IDEA_SKETCH_NO_TEXT_CONSTRAINT}`;
  }
  return result;
}
