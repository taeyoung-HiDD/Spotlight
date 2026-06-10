"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { fitSynthesisPostitTextarea } from "@/lib/stages/stage4/empathyPostitFitText";

interface SynthesisPostitTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** false면 CSS 고정 폰트(자동 축소 없음) */
  autoFit?: boolean;
  className?: string;
}

export function SynthesisPostitTextarea({
  value,
  onChange,
  placeholder = "적어 보세요",
  autoFit = true,
  className = "",
}: SynthesisPostitTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const refit = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!autoFit) {
      el.style.fontSize = "";
      el.style.height = "";
      el.style.overflowY = "";
      return;
    }
    fitSynthesisPostitTextarea(el);
  }, [autoFit]);

  useLayoutEffect(() => {
    refit();
  }, [value, refit]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => refit());
    observer.observe(el);
    const paper = el.closest(".synthesis-postit-paper");
    if (paper) observer.observe(paper);

    return () => observer.disconnect();
  }, [refit, autoFit]);

  return (
    <textarea
      ref={(el) => {
        textareaRef.current = el;
        if (el) refit();
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={["synthesis-postit-text break-keep", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
