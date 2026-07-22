"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Gemini 이미지 생성 평균 소요(체감) — 실제 API는 스트리밍 진행률 없음 */
const DEFAULT_ESTIMATE_MS = 28_000;

export function useSimulatedAsyncProgress(
  active: boolean,
  estimatedMs = DEFAULT_ESTIMATE_MS,
) {
  const [progress, setProgress] = useState(0);
  const [remainingSec, setRemainingSec] = useState(
    Math.ceil(estimatedMs / 1000),
  );
  const startedAtRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const reset = useCallback(() => {
    setProgress(0);
    setRemainingSec(Math.ceil(estimatedMs / 1000));
    startedAtRef.current = null;
    completedRef.current = false;
  }, [estimatedMs]);

  const markComplete = useCallback(() => {
    completedRef.current = true;
    setProgress(100);
    setRemainingSec(0);
  }, []);

  useEffect(() => {
    if (!active) return;

    startedAtRef.current = Date.now();
    completedRef.current = false;
    setProgress(0);
    setRemainingSec(Math.ceil(estimatedMs / 1000));

    const tick = () => {
      if (completedRef.current) return;
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      const ratio = elapsed / estimatedMs;
      const next = Math.min(92, Math.round((1 - Math.exp(-ratio * 2.4)) * 92));
      setProgress(next);

      if (next >= 92) {
        setRemainingSec(Math.max(1, Math.ceil((estimatedMs - elapsed) / 1000)));
        return;
      }
      if (next > 0) {
        const totalEstimate = (elapsed / next) * 100;
        setRemainingSec(
          Math.max(1, Math.ceil((totalEstimate - elapsed) / 1000)),
        );
      }
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [active, estimatedMs]);

  useEffect(() => {
    if (!active) reset();
  }, [active, reset]);

  return { progress, remainingSec, markComplete, reset };
}
