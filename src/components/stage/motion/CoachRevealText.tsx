"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import {
  delayForRevealUnit,
  tokenizeRevealUnits,
} from "@/lib/motion/coachRevealText";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { sleep } from "@/lib/motion/timings";

interface CoachRevealTextProps {
  text: string;
  className?: string;
  onProgress?: () => void;
  onTypingChange?: (typing: boolean) => void;
  onComplete?: () => void;
}

/** 코치 발화 · 글자 단위 좌→우 타이핑 */
export function CoachRevealText({
  text,
  className,
  onProgress,
  onTypingChange,
  onComplete,
}: CoachRevealTextProps) {
  const reducedMotion = useReducedMotion();
  const formatted = useMemo(() => formatCoachDialogBreaks(text), [text]);
  const units = useMemo(() => tokenizeRevealUnits(formatted), [formatted]);
  const [visibleCount, setVisibleCount] = useState(0);
  const onProgressRef = useRef(onProgress);
  const onTypingChangeRef = useRef(onTypingChange);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onTypingChangeRef.current = onTypingChange;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;

    async function reveal() {
      if (reducedMotion) {
        setVisibleCount(units.length);
        onTypingChangeRef.current?.(false);
        onCompleteRef.current?.();
        return;
      }

      setVisibleCount(0);
      onTypingChangeRef.current?.(true);

      for (let i = 0; i < units.length; i++) {
        if (cancelled) return;
        await sleep(delayForRevealUnit(units[i]!));
        if (cancelled) return;
        setVisibleCount(i + 1);
        onProgressRef.current?.();
      }

      if (!cancelled) {
        onTypingChangeRef.current?.(false);
        onCompleteRef.current?.();
      }
    }

    void reveal();

    return () => {
      cancelled = true;
    };
  }, [formatted, reducedMotion, units]);

  const visibleText = units.slice(0, visibleCount).join("");
  const isTyping = visibleCount < units.length;

  return (
    <span className={className}>
      {visibleText}
      {isTyping ? (
        <span className="coach-reveal-cursor ml-px text-spotlight" aria-hidden>
          |
        </span>
      ) : null}
    </span>
  );
}
