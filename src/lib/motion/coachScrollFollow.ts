import { WORKSPACE_MAIN_SCROLL_SELECTOR } from "@/lib/motion/pageEnterScroll";

/** 스크롤 영역 하단과의 거리(px) — 이내면 “끝을 보고 있음” */
export const COACH_SCROLL_NEAR_BOTTOM_PX = 72;

/** workspace 스크롤 시 하단 여백 */
export const COACH_WORKSPACE_SCROLL_PADDING_PX = 28;

export function distanceFromCoachScrollBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}

export function isCoachScrollNearBottom(
  el: HTMLElement,
  threshold = COACH_SCROLL_NEAR_BOTTOM_PX,
): boolean {
  return distanceFromCoachScrollBottom(el) <= threshold;
}

function getWorkspaceMainScrollEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>(WORKSPACE_MAIN_SCROLL_SELECTOR);
}

function scrollElementToBottom(el: HTMLElement): void {
  el.scrollTop = el.scrollHeight;
}

/**
 * 작업 영역(메인) 스크롤 — 요소가 보이도록 아래로 밀어 줌.
 */
export function revealElementInWorkspaceScroll(
  el: HTMLElement | null,
  options: { force?: boolean; padding?: number } = {},
): void {
  if (!el) return;

  const padding = options.padding ?? COACH_WORKSPACE_SCROLL_PADDING_PX;
  const workspace = getWorkspaceMainScrollEl();

  if (!workspace) {
    if (options.force) {
      el.scrollIntoView({ block: "end", behavior: "auto" });
    } else {
      const rect = el.getBoundingClientRect();
      const viewportBottom = window.innerHeight;
      if (rect.bottom > viewportBottom - padding) {
        el.scrollIntoView({ block: "end", behavior: "auto" });
      }
    }
    return;
  }

  const elRect = el.getBoundingClientRect();
  const wsRect = workspace.getBoundingClientRect();
  const overflow = elRect.bottom - (wsRect.bottom - padding);

  if (options.force || overflow > 0) {
    workspace.scrollBy({ top: Math.max(0, overflow), behavior: "auto" });
  }
}

/**
 * 코치 패널 맨 아래(대화·칩·입력창·푸터 포함)로 스크롤을 맞춤.
 */
export function followCoachConversationScroll(options: {
  /** 코치 패널 통합 스크롤 컨테이너 */
  coachScrollEl: HTMLElement | null;
  /** 패널 콘텐츠 최하단 앵커 */
  scrollEndEl?: HTMLElement | null;
  /**
   * true: 생성·레이아웃 변경 시 항상 끝으로 (대화·예시 칩·입력창)
   * false: 사용자가 위로 읽는 중이면 코치 내부 스크롤은 유지, workspace만 필요 시
   */
  force?: boolean;
  nearThreshold?: number;
}): void {
  const {
    coachScrollEl,
    scrollEndEl = null,
    force = false,
    nearThreshold,
  } = options;

  const run = () => {
    if (coachScrollEl) {
      if (force || isCoachScrollNearBottom(coachScrollEl, nearThreshold)) {
        scrollElementToBottom(coachScrollEl);
      }
    }

    const endTarget = scrollEndEl ?? coachScrollEl;
    revealElementInWorkspaceScroll(endTarget, { force: force || Boolean(scrollEndEl) });
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

/** @deprecated followCoachConversationScroll 사용 */
export function followCoachScroll(
  el: HTMLElement | null,
  options: { force?: boolean; nearThreshold?: number } = {},
): void {
  followCoachConversationScroll({
    coachScrollEl: el,
    scrollEndEl: el,
    force: options.force,
    nearThreshold: options.nearThreshold,
  });
}
