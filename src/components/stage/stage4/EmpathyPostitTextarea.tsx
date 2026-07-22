"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { useLocalizedEditable } from "@/hooks/useLocalizedEditable";
import { fitEmpathyPostitTextarea } from "@/lib/stages/stage4/empathyPostitFitText";

interface EmpathyPostitTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMountRef?: (el: HTMLTextAreaElement | null) => void;
  placeholder?: string;
  /** 공감맵 4분면 작은 포스트잇 */
  compact?: boolean;
}

export function EmpathyPostitTextarea({
  value,
  onChange,
  onMountRef,
  placeholder = "적어 보세요",
  compact = false,
}: EmpathyPostitTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editable = useLocalizedEditable(value, onChange);
  const { text: localizedPlaceholder } = useLocalizedContent(placeholder);

  const refit = useCallback(() => {
    const el = textareaRef.current;
    if (el) fitEmpathyPostitTextarea(el, compact);
  }, [compact]);

  useLayoutEffect(() => {
    refit();
  }, [editable.value, refit]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => refit());
    observer.observe(el);
    const paper = el.closest(".empathy-postit-paper");
    if (paper) observer.observe(paper);

    return () => observer.disconnect();
  }, [refit]);

  return (
    <textarea
      ref={(el) => {
        textareaRef.current = el;
        onMountRef?.(el);
        if (el) fitEmpathyPostitTextarea(el, compact);
      }}
      value={editable.value}
      onChange={(e) => editable.onChange(e.target.value)}
      onFocus={editable.onFocus}
      onBlur={editable.onBlur}
      placeholder={localizedPlaceholder}
      data-translating={editable.translating ? "true" : undefined}
      className="empathy-postit-text break-keep"
    />
  );
}
