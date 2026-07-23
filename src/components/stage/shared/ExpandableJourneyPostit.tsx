"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ExpandableJourneyPostitProps = {
  postitId: string;
  expandedPostitId: string | null;
  onExpandedChange: (postitId: string | null) => void;
  /** 축소 상태(원래 자리) */
  children: ReactNode;
  /** 확대 상태 카드 */
  expandedChildren: ReactNode;
  className?: string;
  disabled?: boolean;
};

/**
 * 여정 지도 포스트잇 — 클릭 시 확대(포털), 다시 클릭·바깥 클릭·Esc로 원래 크기.
 * 드래그 직후 클릭은 무시합니다.
 */
export function ExpandableJourneyPostit({
  postitId,
  expandedPostitId,
  onExpandedChange,
  children,
  expandedChildren,
  className,
  disabled = false,
}: ExpandableJourneyPostitProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const expanded = expandedPostitId === postitId;

  const measure = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setAnchor({
      top: rect.top,
      left: rect.left + rect.width / 2,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!expanded) {
      setAnchor(null);
      return;
    }
    measure();
    const onScrollOrResize = () => measure();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [expanded, measure]);

  useEffect(() => {
    if (!expanded) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(`[data-expanded-postit="${postitId}"]`)) return;
      if (target && rootRef.current?.contains(target)) return;
      onExpandedChange(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExpandedChange(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, onExpandedChange, postitId]);

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;
    if ((event.target as HTMLElement).closest("[data-no-expand]")) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    event.stopPropagation();
    onExpandedChange(expanded ? null : postitId);
  };

  return (
    <div
      ref={rootRef}
      className={[
        "user-journey-board__expandable-postit relative min-w-0",
        className ?? "",
      ].join(" ")}
      onClick={handleClick}
      onDragStart={() => {
        suppressClickRef.current = true;
      }}
    >
      <div
        className={[
          "cursor-zoom-in",
          expanded ? "invisible pointer-events-none" : "",
        ].join(" ")}
        aria-hidden={expanded}
      >
        {children}
      </div>

      {expanded && anchor && typeof document !== "undefined"
        ? createPortal(
            <button
              type="button"
              data-expanded-postit={postitId}
              onClick={(event) => {
                event.stopPropagation();
                onExpandedChange(null);
              }}
              className="user-journey-board__expandable-postit-expanded fixed z-[80] w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 cursor-zoom-out rounded-lg border border-border-warm bg-panel p-0 text-left shadow-[0_12px_40px_rgb(28_26_22/0.22)] outline-none focus-visible:ring-2 focus-visible:ring-spotlight/50"
              style={{
                top: Math.max(12, anchor.top - 8),
                left: anchor.left,
              }}
              aria-expanded
              aria-label="포스트잇 축소"
            >
              {expandedChildren}
            </button>,
            document.body,
          )
        : null}
    </div>
  );
}

export function useJourneyPostitExpansion() {
  const [expandedPostitId, setExpandedPostitId] = useState<string | null>(null);
  const onExpandedChange = useCallback((id: string | null) => {
    setExpandedPostitId(id);
  }, []);
  return { expandedPostitId, onExpandedChange };
}
