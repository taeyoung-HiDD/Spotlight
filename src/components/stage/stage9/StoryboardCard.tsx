"use client";

import { ImageTextOverlay } from "@/components/stage/shared/ImageTextOverlay";
import type { ImageOverlayText } from "@/lib/stages/imageOverlayTypes";
import { hasImageOverlayText } from "@/lib/stages/imageOverlayTypes";

export interface StoryboardCardProps {
  imageUrl?: string;
  cutIndex: number;
  isFinale?: boolean;
  overlay: ImageOverlayText;
  generating?: boolean;
  emptyLabel?: string;
  className?: string;
}

/**
 * 스토리보드 컷 — AI 배경(무텍스트) + 한글 오버레이 레이어
 */
export function StoryboardCard({
  imageUrl,
  cutIndex,
  isFinale = false,
  overlay,
  generating = false,
  emptyLabel = "이미지 없음",
  className = "",
}: StoryboardCardProps) {
  const showOverlay = Boolean(imageUrl) && hasImageOverlayText(overlay);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-lg border border-border-warm bg-cream",
        isFinale ? "aspect-[2/1]" : "aspect-square",
        className,
      ].join(" ")}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`스토리보드 컷 ${cutIndex} 배경`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {showOverlay ? (
            <ImageTextOverlay overlay={overlay} variant={isFinale ? "wide" : "default"} />
          ) : null}
        </>
      ) : (
        <div className="flex h-full items-center justify-center px-3 text-center text-[13px] text-muted break-keep">
          {generating ? "생성 중…" : emptyLabel}
        </div>
      )}
    </div>
  );
}
