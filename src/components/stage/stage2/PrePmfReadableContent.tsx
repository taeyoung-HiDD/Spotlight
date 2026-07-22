"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { parsePrePmfReadableText } from "@/lib/stages/stage2/prePmfReadable";
import { stageBody, stageCaption } from "@/lib/stages/ui";

interface PrePmfReadableContentProps {
  text: string;
  emptyLabel?: string;
  compact?: boolean;
}

export function PrePmfReadableContent({
  text,
  emptyLabel = "내용이 없어요.",
  compact = false,
}: PrePmfReadableContentProps) {
  const blocks = parsePrePmfReadableText(text);
  const textClass = compact
    ? "text-[14px] leading-relaxed text-muted break-keep"
    : `${stageBody} break-keep`;

  if (!blocks.length) {
    return (
      <p className={stageCaption}>
        <LocalizedText>{emptyLabel}</LocalizedText>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={`p-${index}`} className={`whitespace-pre-wrap ${textClass}`}>
              <LocalizedText>{block.text}</LocalizedText>
            </p>
          );
        }

        return (
          <ul key={`ul-${index}`} className="space-y-2">
            {block.items.map((item) => (
              <li key={item} className="flex gap-2.5 break-keep">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-gold"
                  aria-hidden
                />
                <span className={textClass}>
                  <LocalizedText>{item}</LocalizedText>
                </span>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
