"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** 4-Lens + Verdict 카드 순서 (로딩·순차 공개) */
export const PRE_PMF_CANVAS_LENS_STEPS = [
  {
    id: "value_proposition",
    loadingLabel: "가치 제안·타겟 사용자를 정리하고 있어요…",
  },
  {
    id: "key_features",
    loadingLabel: "산업·시장 환경을 정리하고 있어요…",
  },
  {
    id: "market_environment",
    loadingLabel: "수익 모델을 정리하고 있어요…",
  },
  {
    id: "current_alternatives",
    loadingLabel: "현재 행태·우회로를 조사하고 있어요…",
  },
  {
    id: "verdict",
    loadingLabel: "Pre-PMF 판단 신호를 정리하고 있어요…",
  },
] as const;

export const PRE_PMF_VERDICT_STEP_INDEX = PRE_PMF_CANVAS_LENS_STEPS.findIndex(
  (step) => step.id === "verdict",
);

export type PrePmfCanvasLensStepId =
  (typeof PRE_PMF_CANVAS_LENS_STEPS)[number]["id"];

export type PrePmfLensCardStatus = "pending" | "loading" | "revealed";

export interface PrePmfLensLoadingProgress {
  percent: number;
  /** null이면 ETA 숨김 (대기·완료) */
  remainingSec: number | null;
}

const LENS_COUNT = PRE_PMF_CANVAS_LENS_STEPS.length;
const LOADING_CYCLE_MS = 3_200;
const REVEAL_STEP_MS = 380;
const PROGRESS_TICK_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function estimateRemainingSec(
  activeIndex: number,
  stepElapsedMs: number,
  includeReveal: boolean,
): number {
  const stepsLeft = Math.max(0, LENS_COUNT - 1 - activeIndex);
  const ms =
    Math.max(0, LOADING_CYCLE_MS - stepElapsedMs) +
    stepsLeft * LOADING_CYCLE_MS +
    (includeReveal ? LENS_COUNT * REVEAL_STEP_MS : 0);
  return Math.max(1, Math.ceil(ms / 1000));
}

export function usePrePmfLensReveal() {
  const [activeLoadingIndex, setActiveLoadingIndex] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const cycleTimerRef = useRef<number | null>(null);
  const stepStartedAtRef = useRef(Date.now());

  const clearCycleTimer = useCallback(() => {
    if (cycleTimerRef.current !== null) {
      window.clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
  }, []);

  const bumpStepClock = useCallback(() => {
    stepStartedAtRef.current = Date.now();
  }, []);

  const reset = useCallback(() => {
    clearCycleTimer();
    setActiveLoadingIndex(0);
    setRevealedCount(0);
    setIsRevealing(false);
    setIsAnimating(false);
    bumpStepClock();
  }, [bumpStepClock, clearCycleTimer]);

  /** API 대기 중 — 현재 분석 중인 렌즈 인덱스를 순환 */
  const startLoadingCycle = useCallback(() => {
    clearCycleTimer();
    setIsAnimating(true);
    setActiveLoadingIndex(0);
    setRevealedCount(0);
    setIsRevealing(false);
    bumpStepClock();
    cycleTimerRef.current = window.setInterval(() => {
      setActiveLoadingIndex((i) => {
        const next = Math.min(LENS_COUNT - 1, i + 1);
        if (next !== i) bumpStepClock();
        return next;
      });
    }, LOADING_CYCLE_MS);
  }, [bumpStepClock, clearCycleTimer]);

  const stopLoadingCycle = useCallback(() => {
    clearCycleTimer();
  }, [clearCycleTimer]);

  /** API 대기 종료(실패·취소) — 순차 공개 전 애니메이션 정리 */
  const finishApiWait = useCallback(() => {
    clearCycleTimer();
    setIsAnimating(false);
  }, [clearCycleTimer]);

  /** API 완료 후 렌즈별 순차 공개 */
  const revealSequentially = useCallback(async () => {
    stopLoadingCycle();
    setIsAnimating(true);
    setIsRevealing(true);
    setRevealedCount(0);
    for (let i = 0; i < LENS_COUNT; i++) {
      setActiveLoadingIndex(i);
      bumpStepClock();
      await delay(REVEAL_STEP_MS);
      setRevealedCount(i + 1);
    }
    setIsRevealing(false);
    setIsAnimating(false);
  }, [bumpStepClock, stopLoadingCycle]);

  const markAllRevealed = useCallback(() => {
    stopLoadingCycle();
    setRevealedCount(LENS_COUNT);
    setIsRevealing(false);
    setIsAnimating(false);
  }, [stopLoadingCycle]);

  const getLensStatus = useCallback(
    (index: number, generating: boolean): PrePmfLensCardStatus => {
      if (index < revealedCount) return "revealed";
      if (!generating && !isRevealing) {
        return revealedCount > index ? "revealed" : "pending";
      }
      if (isRevealing && index === revealedCount) return "loading";
      if (generating && !isRevealing && index <= activeLoadingIndex) {
        return "loading";
      }
      return "pending";
    },
    [activeLoadingIndex, isRevealing, revealedCount],
  );

  const getLensLoadingProgress = useCallback(
    (index: number): PrePmfLensLoadingProgress => {
      const stepElapsed = now - stepStartedAtRef.current;

      if (isRevealing) {
        if (index < revealedCount) {
          return { percent: 100, remainingSec: null };
        }
        if (index === revealedCount) {
          const percent = Math.min(
            100,
            Math.round((stepElapsed / REVEAL_STEP_MS) * 100),
          );
          const remainingSec =
            percent >= 100
              ? null
              : Math.max(1, Math.ceil((REVEAL_STEP_MS - stepElapsed) / 1000));
          return { percent, remainingSec };
        }
        const stepsAhead = index - revealedCount;
        const ms =
          Math.max(0, REVEAL_STEP_MS - stepElapsed) +
          stepsAhead * REVEAL_STEP_MS;
        return {
          percent: 0,
          remainingSec: Math.max(1, Math.ceil(ms / 1000)),
        };
      }

      if (index > activeLoadingIndex) {
        const stepsAhead = index - activeLoadingIndex;
        const ms =
          Math.max(0, LOADING_CYCLE_MS - stepElapsed) +
          Math.max(0, stepsAhead - 1) * LOADING_CYCLE_MS +
          LENS_COUNT * REVEAL_STEP_MS;
        return {
          percent: 0,
          remainingSec: Math.max(1, Math.ceil(ms / 1000)),
        };
      }

      if (index < activeLoadingIndex) {
        return { percent: 100, remainingSec: null };
      }

      const percent = Math.min(
        92,
        Math.round((stepElapsed / LOADING_CYCLE_MS) * 92),
      );
      return {
        percent,
        remainingSec: estimateRemainingSec(
          activeLoadingIndex,
          stepElapsed,
          true,
        ),
      };
    },
    [activeLoadingIndex, isRevealing, now, revealedCount],
  );

  const activeLoadingLabel =
    PRE_PMF_CANVAS_LENS_STEPS[
      Math.min(activeLoadingIndex, LENS_COUNT - 1)
    ]!.loadingLabel;

  useEffect(() => {
    if (!isAnimating) return;
    const id = window.setInterval(() => setNow(Date.now()), PROGRESS_TICK_MS);
    return () => window.clearInterval(id);
  }, [isAnimating]);

  useEffect(() => () => clearCycleTimer(), [clearCycleTimer]);

  return {
    activeLoadingIndex,
    activeLoadingLabel,
    revealedCount,
    isRevealing,
    getLensStatus,
    getLensLoadingProgress,
    startLoadingCycle,
    stopLoadingCycle,
    finishApiWait,
    revealSequentially,
    markAllRevealed,
    reset,
    lensCount: LENS_COUNT,
  };
}
