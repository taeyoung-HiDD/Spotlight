"use client";

import {
  IconPhoto,
  IconPlus,
  IconSparkles,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  fileToPersonaThumbnailDataUrl,
  normalizePersonaThumbnailDataUrl,
} from "@/lib/stages/stage4/compressPersonaImage";
import {
  resolvePersonaThumbnailDisplayUrl,
  sanitizePersonaThumbnailUrl,
} from "@/lib/stages/stage4/personaThumbnail";
import { stageBtnSecondary, stageCaption, stageLabel } from "@/lib/stages/ui";

type PersonaThumbnailEmptyVariant = "panel" | "compact" | "tab" | "center";

interface PersonaThumbnailEmptyProps {
  variant?: PersonaThumbnailEmptyVariant;
}

/** 이미지 없을 때 사용자 아이콘 + 추가(+) 표시 */
export function PersonaThumbnailEmpty({
  variant = "panel",
}: PersonaThumbnailEmptyProps) {
  const userIcon =
    variant === "tab"
      ? "size-3"
      : variant === "compact"
        ? "size-5"
        : variant === "center"
          ? "size-7"
          : "size-8";
  const plusWrap =
    variant === "tab"
      ? "bottom-0 right-0 size-2.5"
      : variant === "compact"
        ? "bottom-0.5 right-0.5 size-3.5"
        : variant === "center"
          ? "bottom-1 right-1 size-5"
          : "bottom-1 right-1 size-5";
  const plusIcon =
    variant === "tab"
      ? "size-2"
      : variant === "compact"
        ? "size-2.5"
        : variant === "center"
          ? "size-3"
          : "size-3";

  const roundClass = variant === "center" ? "rounded-full" : "";

  return (
    <span
      className={[
        "relative flex size-full items-center justify-center bg-cream",
        roundClass,
      ].join(" ")}
    >
      <IconUser className={`${userIcon} text-muted`} stroke={1.5} aria-hidden />
      <span
        className={[
          "absolute flex items-center justify-center rounded-full bg-spotlight text-on-spotlight",
          plusWrap,
        ].join(" ")}
        aria-hidden
      >
        <IconPlus className={plusIcon} stroke={2.5} />
      </span>
    </span>
  );
}

interface PersonaThumbnailFieldProps {
  name: string;
  context: string;
  thumbnailUrl: string;
  onThumbnailChange: (url: string) => void;
  compact?: boolean;
  /** 공감맵 중앙 원형 아바타 */
  variant?: "default" | "center";
}

export function PersonaThumbnailField({
  name,
  context,
  thumbnailUrl,
  onThumbnailChange,
  compact = false,
  variant = "default",
}: PersonaThumbnailFieldProps) {
  const inputId = useId();
  const titleId = useId();
  const descId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCustom = Boolean(thumbnailUrl.trim());
  const displayUrl = hasCustom
    ? resolvePersonaThumbnailDisplayUrl(thumbnailUrl, name, context)
    : null;
  const busy = uploading || generating;

  const closePicker = useCallback(() => {
    if (busy) return;
    setPickerOpen(false);
    setError(null);
  }, [busy]);

  useEffect(() => {
    if (!pickerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePicker();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closePicker, pickerOpen]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const dataUrl = await fileToPersonaThumbnailDataUrl(file);
        const safe = sanitizePersonaThumbnailUrl(dataUrl);
        if (!safe) {
          throw new Error("이미지를 저장할 수 있는 크기로 줄이지 못했습니다.");
        }
        onThumbnailChange(safe);
        setPickerOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [onThumbnailChange],
  );

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/stage4/persona-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, context }),
      });
      const json = (await res.json()) as {
        imageUrl?: string;
        error?: string;
        source?: "ai" | "fallback";
        message?: string;
      };
      if (!res.ok || !json.imageUrl) {
        throw new Error(json.error || "AI 이미지를 만들지 못했습니다.");
      }
      let stored = json.imageUrl;
      if (stored.startsWith("data:image/")) {
        stored = await normalizePersonaThumbnailDataUrl(stored);
      }
      const safe = sanitizePersonaThumbnailUrl(stored);
      if (!safe) {
        throw new Error("이미지를 저장할 수 있는 크기로 줄이지 못했습니다.");
      }
      onThumbnailChange(safe);
      if (json.source === "fallback" && json.message) {
        setError(json.message);
      } else {
        setPickerOpen(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  }, [context, name, onThumbnailChange]);

  const handleClear = useCallback(() => {
    onThumbnailChange("");
    setPickerOpen(false);
    setError(null);
  }, [onThumbnailChange]);

  const isCenter = variant === "center";
  const thumbSize = isCenter
    ? "size-full min-h-[5.5rem] min-w-[5.5rem]"
    : compact
      ? "size-12"
      : "size-24";

  return (
    <>
      <div className={compact || isCenter ? "inline-flex size-full items-center" : ""}>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setPickerOpen(true);
          }}
          aria-label={
            name.trim()
              ? `${name} 대표 이미지 변경`
              : "페르소나 대표 이미지 변경"
          }
          className={[
            "relative shrink-0 overflow-hidden border border-border-warm bg-white transition-colors",
            isCenter
              ? "size-full rounded-full border-[3px] border-foreground shadow-md"
              : "rounded-xl",
            "hover:border-spotlight/60 hover:ring-2 hover:ring-spotlight/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spotlight/40",
            thumbSize,
          ].join(" ")}
        >
          {displayUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={displayUrl}
              alt=""
              className="size-full object-cover"
              onError={() => onThumbnailChange("")}
            />
          ) : (
            <PersonaThumbnailEmpty
              variant={
                isCenter ? "center" : compact ? "compact" : "panel"
              }
            />
          )}
        </button>
      </div>

      {pickerOpen
        ? createPortal(
            <div
              className="persona-thumbnail-picker-layer fixed inset-0 z-[200] flex items-center justify-center p-4"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closePicker();
              }}
            >
              <div className="absolute inset-0 bg-charcoal/40" aria-hidden />

              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                className={[
                  "persona-thumbnail-picker-dialog relative rounded-xl border border-border-warm bg-panel p-4 shadow-[0_12px_40px_rgba(45,45,42,0.18)] sm:p-5",
                  isCenter
                    ? "w-[min(92vw,26rem)]"
                    : "w-full max-w-[360px]",
                ].join(" ")}
              >
                <button
                  ref={closeRef}
                  type="button"
                  onClick={closePicker}
                  disabled={busy}
                  aria-label="닫기"
                  className="absolute right-3 top-3 rounded-md p-1 text-muted transition-colors hover:bg-cream hover:text-foreground disabled:opacity-50"
                >
                  <IconX className="size-4" stroke={2} aria-hidden />
                </button>

                <h2
                  id={titleId}
                  className={`pr-8 ${stageLabel} text-[17px] text-foreground`}
                >
                  대표 이미지
                </h2>
                <p id={descId} className={`mt-1 ${stageCaption} break-keep`}>
                  사진을 올리거나 AI로 라인드로잉 카툰을 만들 수 있어요.
                </p>

                <input
                  ref={fileRef}
                  id={inputId}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleUpload(file);
                  }}
                />

                <div
                  className={
                    isCenter
                      ? "persona-thumbnail-picker-body mt-3.5 grid grid-cols-[5.25rem_1fr] items-start gap-3 sm:mt-4 sm:gap-4"
                      : "mt-4 space-y-4"
                  }
                >
                  <div
                    className={[
                      "overflow-hidden rounded-xl border border-border-warm bg-cream",
                      isCenter ? "size-[5.25rem] shrink-0" : "mx-auto size-20",
                    ].join(" ")}
                  >
                    {displayUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={displayUrl}
                        alt=""
                        className="size-full object-cover"
                        onError={() => onThumbnailChange("")}
                      />
                    ) : (
                      <PersonaThumbnailEmpty variant="panel" />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                      className={[
                        stageBtnSecondary,
                        "inline-flex w-full items-center justify-center gap-1.5",
                      ].join(" ")}
                    >
                      <IconPhoto className="size-4" stroke={1.75} aria-hidden />
                      {uploading ? "올리는 중…" : "사진·이미지 업로드"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleGenerate()}
                      className={[
                        stageBtnSecondary,
                        "inline-flex w-full items-center justify-center gap-1.5",
                      ].join(" ")}
                    >
                      <IconSparkles
                        className="size-4"
                        stroke={1.75}
                        aria-hidden
                      />
                      {generating ? "그리는 중…" : "AI 라인드로잉 만들기"}
                    </button>
                    {hasCustom ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleClear}
                        className={[stageBtnSecondary, "w-full text-muted"].join(
                          " ",
                        )}
                      >
                        이미지 지우기
                      </button>
                    ) : null}
                  </div>
                </div>

                {error ? (
                  <p className="mt-3 text-[14px] text-red-700" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
