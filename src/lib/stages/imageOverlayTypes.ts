/** LLM·폼에서 분리된 한글 텍스트 — 이미지 위 오버레이용 */
export type ImageOverlayText = {
  title?: string;
  description?: string;
  buttonLabel?: string;
  caption?: string;
};

export function hasImageOverlayText(overlay: ImageOverlayText): boolean {
  return Boolean(
    overlay.title?.trim() ||
      overlay.description?.trim() ||
      overlay.buttonLabel?.trim() ||
      overlay.caption?.trim(),
  );
}
