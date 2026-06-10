"use client";

import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { stageCaption } from "@/lib/stages/ui";

interface TermChipProps {
  label: string;
  definition: string;
}

/** 용어 칩 — 짧은 라벨과 정의 접기 */
export function TermChip({ label, definition }: TermChipProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const show = open || hovered;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const tooltipNode = useMemo(() => {
    if (!pos) return null;
    return (
      <span
        role="tooltip"
        className={`pointer-events-none fixed z-[9999] mt-1 w-[260px] max-w-[calc(100vw-24px)] rounded-lg border border-border-warm bg-panel px-3 py-2.5 ${stageCaption} shadow-sm`}
        style={{
          top: pos.top,
          left: pos.left,
        }}
      >
        {definition}
      </span>
    );
  }, [definition, pos]);

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
      const desiredLeft = r.left;
      const maxLeft = Math.max(margin, window.innerWidth - margin - 260);
      const left = Math.min(Math.max(desiredLeft, margin), maxLeft);
      const top = r.bottom + 6;
      setPos({ top, left, width: r.width });
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
      className="inline-flex align-middle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="inline-flex items-center gap-0.5 text-[14px] font-normal text-muted"
        aria-expanded={show}
      >
        <IconInfoCircle className="size-3.5" stroke={2} />
        {label}
      </button>
      {show && tooltipNode ? createPortal(tooltipNode, document.body) : null}
    </span>
  );
}
