"use client";

import type { ReactNode } from "react";
import { ImageTextOverlay } from "@/components/stage/shared/ImageTextOverlay";
import type { ImageOverlayText } from "@/lib/stages/imageOverlayTypes";
import { hasImageOverlayText } from "@/lib/stages/imageOverlayTypes";
import type { PrototypePlatform } from "@/lib/stages/stage10/prototypeTypes";
import { imageOverlayTextBase } from "@/lib/stages/imageOverlayTypography";

export interface PrototypeViewProps {
  platform: PrototypePlatform;
  backgroundImageUrl?: string;
  overlay: ImageOverlayText;
  html?: string;
  emptyLabel?: string;
  children?: ReactNode;
}

/**
 * 시제품 미리보기 — 스토리보드 배경 + 한글 오버레이 또는 HTML iframe
 */
export function PrototypeView({
  platform,
  backgroundImageUrl,
  overlay,
  html,
  emptyLabel = "플랫폼을 고른 뒤 「AI 시제품 생성」을 누르면 미리보기가 나타납니다.",
  children,
}: PrototypeViewProps) {
  const hasHtml = Boolean(html?.trim());
  const frameClass =
    platform === "mobile"
      ? "mx-auto max-w-[390px] min-h-[520px]"
      : "min-h-[520px] w-full";

  if (hasHtml) {
    return (
      <div className="overflow-hidden rounded-xl border border-border-warm bg-cream">
        <iframe
          title="시제품 미리보기"
          srcDoc={html}
          sandbox=""
          className={`${frameClass} bg-white`}
        />
        {children}
      </div>
    );
  }

  const showHero = Boolean(backgroundImageUrl);
  const showOverlay = showHero && hasImageOverlayText(overlay);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border border-border-warm bg-cream",
        frameClass,
      ].join(" ")}
    >
      {showHero ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImageUrl}
            alt="시제품 컨셉 배경"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {showOverlay ? (
            <ImageTextOverlay overlay={overlay} variant="wide" />
          ) : null}
        </>
      ) : (
        <div
          className={`flex h-full min-h-[320px] items-center justify-center px-6 text-center text-[15px] text-muted ${imageOverlayTextBase}`}
        >
          {emptyLabel}
        </div>
      )}
      {children}
    </div>
  );
}
