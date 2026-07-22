"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { useLocalizedEditable } from "@/hooks/useLocalizedEditable";
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
  const editable = useLocalizedEditable(value, onChange);
  const { text: localizedPlaceholder } = useLocalizedContent(placeholder);

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
  }, [editable.value, refit]);

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
      value={editable.value}
      onChange={(e) => editable.onChange(e.target.value)}
      onFocus={editable.onFocus}
      onBlur={editable.onBlur}
      placeholder={localizedPlaceholder}
      data-translating={editable.translating ? "true" : undefined}
      className={["synthesis-postit-text break-keep", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
