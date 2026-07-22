"use client";

/**
 * 읽기 전용 산출물 문구 — EN 모드에서 번역 표시.
 * 편집 필드는 LocalizedEditable* / useLocalizedEditable 사용.
 */
import { useLocalizedContent } from "@/hooks/useLocalizedContent";

interface LocalizedTextProps {
  children: string;
  className?: string;
  as?: "span" | "p" | "div" | "li";
}

export function LocalizedText({
  children,
  className,
  as: Tag = "span",
}: LocalizedTextProps) {
  const { text, translating } = useLocalizedContent(children);
  return (
    <Tag
      className={className}
      data-translating={translating ? "true" : undefined}
    >
      {text}
    </Tag>
  );
}
