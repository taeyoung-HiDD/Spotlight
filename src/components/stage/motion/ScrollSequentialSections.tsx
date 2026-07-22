"use client";

import {
  Children,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MOTION } from "@/lib/motion/timings";

interface ClickSequentialSectionsProps {
  children: ReactNode;
  className?: string;
  /** 처음부터 모두 표시 (자료실·모션 축소 등) */
  revealAll?: boolean;
  /**
   * 이 값이 바뀌면 1단계부터 다시 순차 공개
   * (생성 완료 후 CORE 본문이 채워질 때 등)
   */
  resetKey?: string | number | boolean;
  /** 각 단계 제목 (버튼에 목적지 표시) */
  stepTitles?: string[];
  /** 단계 접두어 (기본 CORE) */
  stepPrefix?: string;
  /** 이전으로 돌아갈 때 라벨 접두 */
  prevLabel?: string;
  /** 다음으로 갈 때 라벨 접두 */
  nextLabel?: string;
  /** 마지막 단계 CTA (선택) */
  doneHint?: string;
}

const navBtnBase =
  "inline-flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spotlight/50";

/**
 * 같은 자리에서 클릭으로 다음 자식을 하나씩 보여 줌 (교체 표시).
 * 이전/다음 버튼에 목적지 제목을 함께 표시.
 */
export function ClickSequentialSections({
  children,
  className = "",
  revealAll = false,
  resetKey,
  stepTitles = [],
  stepPrefix = "CORE",
  prevLabel = "이전",
  nextLabel = "다음",
  doneHint,
}: ClickSequentialSectionsProps) {
  const items = Children.toArray(children).filter(Boolean);
  const reducedMotion = useReducedMotion();
  const showAll = revealAll || reducedMotion || items.length <= 1;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [resetKey, items.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(items.length - 1, prev + 1));
  }, [items.length]);

  if (showAll) {
    return <div className={className}>{items}</div>;
  }

  const current = items[activeIndex];
  const hasPrev = activeIndex > 0;
  const hasMore = activeIndex < items.length - 1;
  const stepLabel = `${activeIndex + 1} / ${items.length}`;

  const prevIndex = activeIndex - 1;
  const nextIndex = activeIndex + 1;
  const prevTitle = stepTitles[prevIndex]?.trim() ?? "";
  const nextTitle = stepTitles[nextIndex]?.trim() ?? "";

  return (
    <div className={className}>
      <div
        key={activeIndex}
        className="coach-message-in"
        style={{
          animation: `coach-message-in ${MOTION.stageRevealMs}ms ease forwards`,
        }}
      >
        {current}
      </div>

      <div className="mt-3 flex flex-col items-stretch gap-2">
        <p className="text-center text-[12px] font-medium text-muted">
          {stepPrefix} {stepLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {hasPrev ? (
            <button
              type="button"
              onClick={goPrev}
              className={[
                navBtnBase,
                "border border-border-warm bg-panel text-foreground hover:bg-cream",
              ].join(" ")}
            >
              <IconChevronLeft
                className="size-4 shrink-0"
                stroke={2.25}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-muted">
                  {prevLabel} · {stepPrefix} {prevIndex + 1}
                </span>
                {prevTitle ? (
                  <span className="mt-0.5 block text-[13.5px] font-semibold leading-snug break-keep">
                    {prevTitle}
                  </span>
                ) : null}
              </span>
            </button>
          ) : null}
          {hasMore ? (
            <button
              type="button"
              onClick={goNext}
              className={[
                navBtnBase,
                hasPrev ? "" : "w-full",
                "border border-spotlight/50 bg-highlight text-foreground hover:bg-spotlight/15",
              ].join(" ")}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-gold">
                  {nextLabel} · {stepPrefix} {nextIndex + 1}
                </span>
                {nextTitle ? (
                  <span className="mt-0.5 block text-[13.5px] font-semibold leading-snug break-keep">
                    {nextTitle}
                  </span>
                ) : null}
              </span>
              <IconChevronRight
                className="size-4 shrink-0"
                stroke={2.25}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
        {!hasMore && doneHint ? (
          <p className="rounded-xl border border-border-warm bg-cream/50 px-4 py-3 text-center text-[13px] text-muted break-keep">
            {doneHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** @deprecated 이름 호환 — ClickSequentialSections 사용 */
export const ScrollSequentialSections = ClickSequentialSections;
