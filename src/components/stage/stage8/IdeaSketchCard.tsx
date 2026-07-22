"use client";

import { IconTrash } from "@tabler/icons-react";

export interface IdeaSketchCardProps {
  imageUrl: string;
  className?: string;
  alt?: string;
  onClear?: () => void;
  clearDisabled?: boolean;
}

/** 9그리드 아이디어 스케치 — 흰 캔버스 이미지만 */
export function IdeaSketchCard({
  imageUrl,
  className = "",
  alt = "Idea sketch",
  onClear,
  clearDisabled = false,
}: IdeaSketchCardProps) {
  return (
    <div
      className={[
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border-warm bg-white",
        className,
      ].join(" ")}
    >
      <div className="relative min-h-[160px] flex-1 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="block h-full min-h-[160px] w-full bg-white object-contain object-center"
        />
      </div>

      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          disabled={clearDisabled}
          className="absolute top-2 right-2 z-20 rounded-md border border-border-warm/60 bg-white/95 p-1 text-muted shadow-sm hover:text-foreground disabled:opacity-50"
          aria-label="스케치 삭제"
        >
          <IconTrash className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
