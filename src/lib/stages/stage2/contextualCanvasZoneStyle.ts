import type { ContextualCanvasZoneId } from "@/lib/stages/stage2/contextualCanvasLayout";

/** 3영역(사람·환경·경쟁 구도) — 동일 레벨 헤더 타이포 */
export const CONTEXTUAL_ZONE_HEADER_TITLE =
  "text-[14px] font-semibold text-foreground break-keep sm:text-[16px]";
export const CONTEXTUAL_ZONE_HEADER_LEAD =
  "mt-0.5 text-[11.5px] text-muted break-keep sm:text-[12.5px]";

/** 하위 항목(주 사용자·이해 관계자 등) — 흰색 통일 */
export const CONTEXTUAL_CELL_TITLE =
  "font-semibold leading-snug break-keep text-zone-cell-fg";
export const CONTEXTUAL_CELL_TITLE_SM =
  "text-[12.5px] sm:text-[14px]";
export const CONTEXTUAL_CELL_TITLE_LG =
  "text-[14px] sm:text-[15px]";
export const CONTEXTUAL_CELL_PREVIEW =
  "text-[11.5px] leading-snug break-keep text-zone-cell-fg-muted sm:text-[12.5px]";
export const CONTEXTUAL_CELL_BODY =
  "text-zone-cell-fg";
export const CONTEXTUAL_CELL_SUBTLE =
  "text-zone-cell-fg-muted";

export const CONTEXTUAL_CELL_HEADER_BAR =
  "bg-zone-cell-bg transition-colors hover:bg-zone-cell-bg/90";
export const CONTEXTUAL_CELL_BODY_SURFACE =
  "border-t border-white/10 bg-zone-cell-bg text-[12.5px] leading-relaxed break-keep sm:text-[14px]";

/** 영역별 외곽·배경 (폰트 색 아님) */
export interface ContextualZoneChromeStyle {
  sectionShell: string;
  sectionHeader: string;
}

export const CONTEXTUAL_ZONE_CHROME: Record<
  ContextualCanvasZoneId,
  ContextualZoneChromeStyle
> = {
  people: {
    sectionShell:
      "rounded-lg border-2 border-zone-people/55 bg-zone-people-surface shadow-[inset_0_0_0_1px_rgba(139,105,20,0.08)]",
    sectionHeader:
      "border-b-2 border-zone-people/35 bg-zone-people-surface px-3 py-2 sm:px-4",
  },
  environment: {
    sectionShell:
      "rounded-lg border-2 border-zone-environment/55 bg-zone-environment-surface shadow-[inset_0_0_0_1px_rgba(61,107,88,0.08)]",
    sectionHeader:
      "border-b-2 border-zone-environment/35 bg-zone-environment-surface px-3 py-2 sm:px-4",
  },
  landscape: {
    sectionShell:
      "rounded-lg border-2 border-zone-landscape/55 bg-zone-landscape-surface shadow-[inset_0_0_0_1px_rgba(79,77,106,0.08)]",
    sectionHeader:
      "border-b-2 border-zone-landscape/35 bg-zone-landscape-surface px-3 py-2 sm:px-4",
  },
};

export function zoneChrome(
  zoneId: ContextualCanvasZoneId,
): ContextualZoneChromeStyle {
  return CONTEXTUAL_ZONE_CHROME[zoneId];
}
