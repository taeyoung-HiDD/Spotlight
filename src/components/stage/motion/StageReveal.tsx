"use client";

import { Children, type CSSProperties, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MOTION } from "@/lib/motion/timings";

interface StageRevealGroupProps {
  children: ReactNode;
  className?: string;
}

export function StageRevealGroup({ children, className = "" }: StageRevealGroupProps) {
  return <div className={className}>{children}</div>;
}

interface StageRevealItemProps {
  children: ReactNode;
  /** 그룹 내 순서 (0부터) */
  index: number;
  /** 추가 지연 (ms) — 코치 완료 후 작업 영역 등 */
  baseDelayMs?: number;
  className?: string;
  /** false면 렌더하지 않음 (조건부 블록용) */
  show?: boolean;
}

export function StageRevealItem({
  children,
  index,
  baseDelayMs = 0,
  className = "",
  show = true,
}: StageRevealItemProps) {
  const reducedMotion = useReducedMotion();

  if (!show) {
    return null;
  }

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const style = {
    "--reveal-index": index,
    "--reveal-base-delay": `${baseDelayMs}ms`,
    "--reveal-stagger": `${MOTION.stageStaggerMs}ms`,
  } as CSSProperties;

  return (
    <div className={["stage-reveal-item", className].join(" ")} style={style}>
      {children}
    </div>
  );
}

/** 작업 영역 내부 블록 순차 등장 */
export function StageWorkReveal({
  children,
  className = "",
  startDelayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  startDelayMs?: number;
}) {
  const items = Children.toArray(children);

  return (
    <StageRevealGroup className={className}>
      {items.map((child, i) => (
        <StageRevealItem key={i} index={i} baseDelayMs={startDelayMs}>
          {child}
        </StageRevealItem>
      ))}
    </StageRevealGroup>
  );
}
