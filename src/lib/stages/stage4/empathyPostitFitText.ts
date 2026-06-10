/** globals.css .empathy-postit-text 기본값 ≈ calc(1.625rem * 0.91) @ 16px root */
export const EMPATHY_POSTIT_FONT_MAX_PX = 23.66;
export const EMPATHY_POSTIT_FONT_MIN_PX = 11.05;
export const EMPATHY_POSTIT_FONT_QUADRANT_MAX_PX = 14.3;
export const EMPATHY_POSTIT_FONT_QUADRANT_MIN_PX = 8.45;
export const SYNTHESIS_POSTIT_FONT_MAX_PX = 15.2;
export const SYNTHESIS_POSTIT_FONT_MIN_PX = 8;

const FIT_STEP_PX = 0.25;

type PostitFitOptions = {
  maxPx: number;
  minPx: number;
};

function textFits(textarea: HTMLTextAreaElement): boolean {
  return textarea.scrollHeight <= textarea.clientHeight + 1;
}

/** 포스트잇 안에 전체 텍스트가 들어가도록 폰트 크기 자동 축소 */
export function fitPostitTextarea(
  textarea: HTMLTextAreaElement,
  { maxPx, minPx }: PostitFitOptions,
): void {
  textarea.style.overflow = "hidden";

  if (!textarea.value.trim()) {
    textarea.style.fontSize = `${maxPx}px`;
    return;
  }

  let lo = minPx;
  let hi = maxPx;
  let best = minPx;

  while (hi - lo > FIT_STEP_PX) {
    const mid = (lo + hi) / 2;
    textarea.style.fontSize = `${mid}px`;
    if (textFits(textarea)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  textarea.style.fontSize = `${best}px`;

  let size = best;
  while (size > minPx && !textFits(textarea)) {
    size -= FIT_STEP_PX;
    textarea.style.fontSize = `${size}px`;
  }
}

export function fitEmpathyPostitTextarea(
  textarea: HTMLTextAreaElement,
  compact = false,
): void {
  fitPostitTextarea(textarea, {
    maxPx: compact
      ? EMPATHY_POSTIT_FONT_QUADRANT_MAX_PX
      : EMPATHY_POSTIT_FONT_MAX_PX,
    minPx: compact
      ? EMPATHY_POSTIT_FONT_QUADRANT_MIN_PX
      : EMPATHY_POSTIT_FONT_MIN_PX,
  });
}

export function fitSynthesisPostitTextarea(textarea: HTMLTextAreaElement): void {
  fitPostitTextarea(textarea, {
    maxPx: SYNTHESIS_POSTIT_FONT_MAX_PX,
    minPx: SYNTHESIS_POSTIT_FONT_MIN_PX,
  });
}
