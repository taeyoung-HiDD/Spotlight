"use client";

/**
 * 일반 input/textarea용 영문 편집·저장 래퍼.
 */
import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { useLocalizedEditable } from "@/hooks/useLocalizedEditable";

export function LocalizedEditableInput({
  value,
  onValueChange,
  placeholder,
  onBlur,
  onFocus,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const editable = useLocalizedEditable(value, onValueChange);
  const { text: localizedPlaceholder } = useLocalizedContent(placeholder ?? "");

  return (
    <input
      {...rest}
      value={editable.value}
      onChange={(e) => editable.onChange(e.target.value)}
      onFocus={(e) => {
        editable.onFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        editable.onBlur();
        onBlur?.(e);
      }}
      placeholder={placeholder ? localizedPlaceholder : placeholder}
      data-translating={editable.translating ? "true" : undefined}
    />
  );
}

export function LocalizedEditableTextarea({
  value,
  onValueChange,
  placeholder,
  onBlur,
  onFocus,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const editable = useLocalizedEditable(value, onValueChange);
  const { text: localizedPlaceholder } = useLocalizedContent(placeholder ?? "");

  return (
    <textarea
      {...rest}
      value={editable.value}
      onChange={(e) => editable.onChange(e.target.value)}
      onFocus={(e) => {
        editable.onFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        editable.onBlur();
        onBlur?.(e);
      }}
      placeholder={placeholder ? localizedPlaceholder : placeholder}
      data-translating={editable.translating ? "true" : undefined}
    />
  );
}
