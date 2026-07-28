"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface GuidePlaybackStep<TStepId extends string = string> {
  id: TStepId;
  /**
   * 이 스텝을 자동으로 유지할 시간(ms). 생략하면 advance()를 직접 호출할 때까지
   * 대기해요 — 예: 텍스트 타이핑 완료 콜백에서 advance()를 부르는 경우.
   */
  holdMs?: number;
}

interface UseGuidePlaybackOptions<TStepId extends string> {
  /** 참조가 안정적이어야 해요(useMemo로 감싸서 전달) */
  steps: GuidePlaybackStep<TStepId>[];
}

interface UseGuidePlaybackResult<TStepId extends string> {
  stepIndex: number;
  stepId: TStepId | undefined;
  isComplete: boolean;
  reducedMotion: boolean;
  /** 현재 스텝을 즉시 끝내고 다음 스텝으로 넘어가요 */
  advance: () => void;
  /** 처음부터 다시 재생해요 */
  replay: () => void;
}

/**
 * 단계 가이드의 "실제 내용이 작성되는 모습"을 재현하는 범용 스텝 재생 엔진.
 * `prefers-reduced-motion`이면 애니메이션 없이 즉시 마지막 스텝(완성 상태)을 보여줘요.
 */
export function useGuidePlayback<TStepId extends string>({
  steps,
}: UseGuidePlaybackOptions<TStepId>): UseGuidePlaybackResult<TStepId> {
  const reducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    clearTimer();
    setStepIndex((current) => {
      const next = current + 1;
      if (next >= steps.length) {
        setIsComplete(true);
        return current;
      }
      return next;
    });
  }, [clearTimer, steps.length]);

  const replay = useCallback(() => {
    clearTimer();
    setIsComplete(false);
    setStepIndex(0);
  }, [clearTimer]);

  useEffect(() => {
    clearTimer();

    if (reducedMotion) {
      setIsComplete(true);
      setStepIndex(Math.max(0, steps.length - 1));
      return;
    }

    if (isComplete) return;

    const step = steps[stepIndex];
    if (step?.holdMs !== undefined) {
      timerRef.current = setTimeout(advance, step.holdMs);
    }

    return clearTimer;
    // steps는 호출부에서 참조 안정적으로(useMemo) 넘겨주는 것을 전제로 해요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, reducedMotion, isComplete]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    stepIndex,
    stepId: steps[stepIndex]?.id,
    isComplete,
    reducedMotion,
    advance,
    replay,
  };
}
