"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { stageCaption } from "@/lib/stages/ui";

interface SynthesisKindHoverChipProps {
  description: string;
  className?: string;
  children: ReactNode;
}

/** 데이터 정리 범례·컬럼 헤더 — 호버 시 의미 설명 */
export function SynthesisKindHoverChip({
  description,
  className = "",
  children,
}: SynthesisKindHoverChipProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const show = hovered || focused;
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const tooltipNode = useMemo(() => {
    if (!pos) return null;
    return (
      <span
        role="tooltip"
        className={`pointer-events-none fixed z-[9999] w-[min(280px,calc(100vw-24px))] rounded-lg border border-border-warm bg-panel px-3 py-2.5 ${stageCaption} leading-relaxed shadow-sm break-keep`}
        style={{ top: pos.top, left: pos.left }}
      >
        {description}
      </span>
    );
  }, [description, pos]);

  useEffect(() => {
    if (!show) {
      setPos(null);
      return;
    }
    const el = anchorRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      const margin = 8;
      const width = Math.min(280, window.innerWidth - margin * 2);
      const left = Math.min(
        Math.max(r.left, margin),
        window.innerWidth - margin - width,
      );
      const top = r.bottom + 6;
      setPos({ top, left });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [show]);

  return (
    <span
      ref={anchorRef}
      className={["inline-flex cursor-help", className].filter(Boolean).join(" ")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      tabIndex={0}
    >
      {children}
      {show && tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </span>
  );
}
