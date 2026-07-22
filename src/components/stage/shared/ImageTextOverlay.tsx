"use client";

import type { ImageOverlayText } from "@/lib/stages/imageOverlayTypes";
import {
  imageOverlayButton,
  imageOverlayCaption,
  imageOverlayCaptionBar,
  imageOverlayDescription,
  imageOverlaySurface,
  imageOverlayTitle,
} from "@/lib/stages/imageOverlayTypography";

interface ImageTextOverlayProps {
  overlay: ImageOverlayText;
  /** finale 컷 등 넓은 프레임 */
  variant?: "default" | "wide";
}

/**
 * AI 배경 이미지 위 한글 텍스트 레이어 — 이미지·텍스트 분리 아키텍처
 */
export function ImageTextOverlay({
  overlay,
  variant = "default",
}: ImageTextOverlayProps) {
  const title = overlay.title?.trim();
  const description = overlay.description?.trim();
  const buttonLabel = overlay.buttonLabel?.trim();
  const caption = overlay.caption?.trim();

  return (
    <>
      {title ? (
        <div
          className={[
            "absolute top-3 left-3 z-10 max-w-[85%]",
            imageOverlaySurface,
            "px-2.5 py-1.5",
          ].join(" ")}
        >
          <p className={imageOverlayTitle}>{title}</p>
        </div>
      ) : null}

      {description ? (
        <div
          className={[
            "absolute z-10 max-w-[88%]",
            variant === "wide" ? "top-14 left-4" : "top-12 left-3",
            imageOverlaySurface,
            "px-2.5 py-1.5",
          ].join(" ")}
        >
          <p className={imageOverlayDescription}>{description}</p>
        </div>
      ) : null}

      {buttonLabel ? (
        <div
          className={[
            "absolute right-3 z-10",
            caption ? "bottom-14" : "bottom-3",
            "rounded-full bg-spotlight px-3 py-1.5 shadow-sm",
          ].join(" ")}
        >
          <span className={`${imageOverlayButton} text-on-spotlight`}>
            {buttonLabel}
          </span>
        </div>
      ) : null}

      {caption ? (
        <div
          className={[
            "absolute right-0 bottom-0 left-0 z-10",
            imageOverlayCaptionBar,
            "px-3 py-2.5",
          ].join(" ")}
        >
          <p className={imageOverlayCaption}>{caption}</p>
        </div>
      ) : null}
    </>
  );
}
