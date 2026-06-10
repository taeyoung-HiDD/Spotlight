"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getResearchMethodSummary } from "@/lib/stages/fieldResearch/researchMethodCatalog";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";
import { stageCaption } from "@/lib/stages/ui";

interface ResearchMethodInfoIconProps {
  method: ResearchMethodId | "";
}

/** 조사 방법 선택 옆 — 요약 설명 툴팁 */
export function ResearchMethodInfoIcon({ method }: ResearchMethodInfoIconProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const show = open || hovered;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const summary = getResearchMethodSummary(method);
  const label = method ? "조사 방법 설명" : "조사 방법 안내";

  const tooltipNode = useMemo(() => {
    if (!pos) return null;
    return (
      <span
        role="tooltip"
        className={`pointer-events-none fixed z-[9999] w-[min(280px,calc(100vw-24px))] rounded-lg border border-border-warm bg-panel px-3 py-2.5 ${stageCaption} leading-relaxed shadow-sm break-keep`}
        style={{ top: pos.top, left: pos.left }}
      >
        {summary}
      </span>
    );
  }, [pos, summary]);

  useEffect(() => {
    if (!show) {
      setPos(null);
      return;
    }
    const el = btnRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      const margin = 8;
      const width = Math.min(280, window.innerWidth - margin * 2);
      const desiredLeft = r.right - width;
      const left = Math.min(
        Math.max(desiredLeft, margin),
        window.innerWidth - margin - width,
      );
      setPos({ top: r.bottom + 6, left });
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
      className="inline-flex shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="inline-flex size-7 items-center justify-center rounded-md border border-border-warm bg-panel text-muted hover:bg-surface hover:text-foreground"
        aria-label={label}
        aria-expanded={show}
      >
        <IconInfoCircle className="size-4" stroke={2} aria-hidden />
      </button>
      {show && tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </span>
  );
}
