"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export const WORKSPACE_MAIN_SCROLL_SELECTOR = "[data-workspace-main-scroll]";

/** 작업 영역(우측 스크롤 컬럼) — 코치 대화 이어짐처럼 새 블록이 보이도록 스크롤 */
export function scrollWorkspaceMain(
  options: { behavior?: ScrollBehavior; top?: number } = {},
): void {
  const el = document.querySelector<HTMLElement>(WORKSPACE_MAIN_SCROLL_SELECTOR);
  if (!el) return;

  const behavior = options.behavior ?? "smooth";
  const top = options.top ?? 0;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollTo({ top, behavior });
    });
  });
}

/** 페이지·단계·페이즈 키가 바뀔 때 작업 영역 스크롤을 대화 이어짐 방식으로 맞춤 */
export function useWorkspaceScrollOnEnter(enterKey: string | number | boolean): void {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    scrollWorkspaceMain({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [enterKey, reducedMotion]);
}
