/** 무드 가이드 v3.1 · 마스터 스펙 §1.6 — 오버레이 한글 타이포 */
export const imageOverlayTextBase =
  "break-keep font-sans text-[#222222] [word-break:keep-all]";

export const imageOverlayTitle =
  `${imageOverlayTextBase} text-sm font-semibold leading-snug sm:text-[15px]`;

export const imageOverlayDescription =
  `${imageOverlayTextBase} text-xs font-medium leading-relaxed text-[#333333] sm:text-[13px]`;

export const imageOverlayCaption =
  `${imageOverlayTextBase} text-sm font-medium leading-snug`;

export const imageOverlayButton =
  `${imageOverlayTextBase} text-xs font-semibold`;

export const imageOverlaySurface =
  "rounded-md bg-white/80 shadow-sm backdrop-blur-sm";

export const imageOverlayCaptionBar =
  "rounded-b-lg bg-white/85 backdrop-blur-sm";
