"use client";

import {
  IconChevronDown,
  IconMicrophone,
  IconPhoto,
  IconPlayerPlay,
  IconSparkles,
  IconTrash,
  IconVideo,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  deleteResearchMediaFile,
  resolveResearchMediaUrl,
  uploadResearchMediaFile,
} from "@/lib/stages/stage4/researchMediaClient";
import {
  researchMediaKindLabel,
  type ResearchMediaFile,
} from "@/lib/stages/stage4/researchMediaTypes";
import { stageBtnSecondary, stageCaption, stageLabel } from "@/lib/stages/ui";

interface ResearchSubjectMediaPanelProps {
  projectId: string;
  subjectId: string;
  mediaFiles: ResearchMediaFile[];
  onChange: (files: ResearchMediaFile[]) => void;
  /** 방금 업로드된 자료 (영상 자동 분석 등) */
  onUploaded?: (added: ResearchMediaFile[]) => void;
  /** 영상·음성 자료를 AI로 분석해 포스트잇 생성 */
  onAnalyze?: () => void;
  analyzing?: boolean;
  analyzeError?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function MediaKindIcon({ kind }: { kind: ResearchMediaFile["kind"] }) {
  if (kind === "photo") return <IconPhoto className="size-5" stroke={1.75} />;
  if (kind === "video") return <IconVideo className="size-5" stroke={1.75} />;
  return <IconMicrophone className="size-5" stroke={1.75} />;
}

function MediaThumbnail({
  media,
  url,
}: {
  media: ResearchMediaFile;
  url: string;
}) {
  if (media.kind === "photo" && url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={url} alt="" className="size-full object-cover" />
    );
  }
  if (media.kind === "video" && url) {
    return (
      <>
        <video
          src={url}
          className="size-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-charcoal/20"
          aria-hidden
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-panel/90 text-foreground shadow-sm">
            <IconPlayerPlay className="size-5" stroke={2} />
          </span>
        </span>
      </>
    );
  }
  if (media.kind === "audio" && url) {
    return (
      <audio src={url} className="w-full" controls preload="metadata" />
    );
  }
  return (
    <div className="flex size-full items-center justify-center bg-cream text-muted">
      <MediaKindIcon kind={media.kind} />
    </div>
  );
}

function ResearchMediaPreviewDialog({
  media,
  url,
  onClose,
}: {
  media: ResearchMediaFile;
  url: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      videoRef.current?.pause();
    };
  }, [onClose]);

  const label = media.fileName || researchMediaKindLabel(media.kind);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-charcoal/50" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(90vh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border-warm bg-panel shadow-[0_12px_40px_rgba(45,45,42,0.22)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-warm px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="truncate text-[15px] font-semibold text-foreground"
            >
              {label}
            </h2>
            <p className={`mt-0.5 ${stageCaption}`}>
              {researchMediaKindLabel(media.kind)} ·{" "}
              {formatFileSize(media.sizeBytes)}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="미리보기 닫기"
            className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-cream hover:text-foreground"
          >
            <IconX className="size-4" stroke={2} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-charcoal/5 p-4">
          {media.kind === "photo" && url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt=""
              className="max-h-[min(72vh,44rem)] w-auto max-w-full rounded-md object-contain"
            />
          ) : media.kind === "video" && url ? (
            <video
              ref={videoRef}
              src={url}
              className="max-h-[min(72vh,44rem)] w-full max-w-full rounded-md bg-charcoal/90"
              controls
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            <p className={stageCaption}>미리보기를 불러오지 못했어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResearchSubjectMediaPanel({
  projectId,
  subjectId,
  mediaFiles,
  onChange,
  onUploaded,
  onAnalyze,
  analyzing = false,
  analyzeError = null,
}: ResearchSubjectMediaPanelProps) {
  const photoInputId = useId();
  const videoInputId = useId();
  const audioInputId = useId();
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [previewMediaId, setPreviewMediaId] = useState<string | null>(null);
  const bodyId = useId();

  useEffect(() => {
    setExpanded(true);
  }, [subjectId]);

  const previewMedia = previewMediaId
    ? mediaFiles.find((m) => m.id === previewMediaId) ?? null
    : null;
  const previewUrl = previewMedia ? (urls[previewMedia.id] ?? "") : "";
  const hasAnalyzableMedia = mediaFiles.some(
    (m) => m.kind === "video" || m.kind === "audio",
  );

  const closePreview = useCallback(() => {
    setPreviewMediaId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        mediaFiles.map(async (m) => {
          const url = await resolveResearchMediaUrl(m);
          return [m.id, url] as const;
        }),
      );
      if (!cancelled) {
        setUrls(Object.fromEntries(entries));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaFiles]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      setError(null);
      const next = [...mediaFiles];
      const added: ResearchMediaFile[] = [];
      try {
        for (const file of Array.from(files)) {
          const media = await uploadResearchMediaFile({
            projectId,
            subjectId,
            file,
          });
          next.push(media);
          added.push(media);
        }
        onChange(next);
        if (added.length > 0) {
          setExpanded(true);
          onUploaded?.(added);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [mediaFiles, onChange, onUploaded, projectId, subjectId],
  );

  const removeMedia = useCallback(
    async (media: ResearchMediaFile) => {
      const ok = window.confirm(`「${media.fileName}」을(를) 삭제할까요?`);
      if (!ok) return;
      setError(null);
      try {
        await deleteResearchMediaFile(media);
        onChange(mediaFiles.filter((m) => m.id !== media.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
      }
    },
    [mediaFiles, onChange],
  );

  return (
    <>
    <section className="rounded-xl border border-border-warm bg-cream/40 p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-controls={bodyId}
      >
        <div className="min-w-0">
          <p className={stageLabel}>리서치 자료</p>
          <p className={`mt-1 ${stageCaption}`}>
            {expanded
              ? "조사 중 기록한 사진·영상·음성을 올려 두세요. 팀과 Kevin이 함께 볼 수 있어요."
              : mediaFiles.length > 0
                ? `자료 ${mediaFiles.length}개 · 펼치면 업로드·미리보기`
                : "자료 없음 · 펼치면 업로드"}
          </p>
        </div>
        <span
          className={[
            "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border-warm bg-panel text-muted transition-transform",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        >
          <IconChevronDown className="size-4" stroke={2} />
        </span>
      </button>

      {expanded ? (
      <div id={bodyId} className="mt-3">
      <div className="flex flex-wrap gap-2">
        <input
          ref={photoRef}
          id={photoInputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={videoRef}
          id={videoInputId}
          type="file"
          accept="video/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={audioRef}
          id={audioInputId}
          type="file"
          accept="audio/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => photoRef.current?.click()}
          className={stageBtnSecondary}
        >
          <IconPhoto className="mr-1 inline size-4" stroke={1.75} />
          사진
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => videoRef.current?.click()}
          className={stageBtnSecondary}
        >
          <IconVideo className="mr-1 inline size-4" stroke={1.75} />
          영상
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => audioRef.current?.click()}
          className={stageBtnSecondary}
        >
          <IconMicrophone className="mr-1 inline size-4" stroke={1.75} />
          음성
        </button>
      </div>

      {onAnalyze ? (
        <div className="mt-3 rounded-lg border border-spotlight/40 bg-highlight/40 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`${stageCaption} min-w-0`}>
              영상을 올리면 대상자의{" "}
              <b className="font-semibold text-foreground">행동</b>을 읽어{" "}
              <b className="font-semibold text-foreground">행동함</b> 포스트잇으로 붙여요.
              음성은 말함·생각함·느낌도 함께 정리해요.
            </p>
            <button
              type="button"
              disabled={analyzing || uploading || !hasAnalyzableMedia}
              onClick={onAnalyze}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-spotlight px-3 py-2 text-[14px] font-semibold text-on-spotlight transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <IconSparkles className="size-4" stroke={2} aria-hidden />
              {analyzing ? "분석 중…" : "AI로 자료 분석하기"}
            </button>
          </div>
          {!hasAnalyzableMedia ? (
            <p className={`mt-1.5 ${stageCaption}`}>
              분석하려면 영상 또는 음성 자료를 먼저 올려 주세요.
            </p>
          ) : null}
          {analyzeError ? (
            <p className="mt-1.5 text-[13px] text-red-700" role="alert">
              {analyzeError}
            </p>
          ) : null}
        </div>
      ) : null}

      {uploading ? (
        <p className={`mt-2 ${stageCaption}`}>올리는 중…</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[14px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {mediaFiles.length === 0 ? (
        <p className={`mt-4 rounded-md border border-dashed border-border-warm bg-panel/60 px-3 py-6 text-center ${stageCaption}`}>
          아직 올린 자료가 없어요.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mediaFiles.map((media) => {
            const url = urls[media.id] ?? "";
            const canPreview =
              (media.kind === "photo" || media.kind === "video") && Boolean(url);

            return (
            <li
              key={media.id}
              className="overflow-hidden rounded-lg border border-border-warm bg-panel"
            >
              {canPreview ? (
                <button
                  type="button"
                  onClick={() => setPreviewMediaId(media.id)}
                  aria-label={`${media.fileName || researchMediaKindLabel(media.kind)} 미리보기`}
                  className="relative block aspect-[4/3] w-full bg-cream text-left transition-colors hover:bg-cream/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-spotlight/50"
                >
                  <MediaThumbnail media={media} url={url} />
                </button>
              ) : (
                <div
                  className={
                    media.kind === "audio"
                      ? "flex min-h-[4.5rem] items-center px-3 py-2"
                      : "aspect-[4/3] bg-cream"
                  }
                >
                  <MediaThumbnail media={media} url={url} />
                </div>
              )}
              <div className="flex items-start justify-between gap-2 border-t border-border-warm px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {media.fileName || researchMediaKindLabel(media.kind)}
                  </p>
                  <p className={`${stageCaption}`}>
                    {researchMediaKindLabel(media.kind)} ·{" "}
                    {formatFileSize(media.sizeBytes)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => void removeMedia(media)}
                  className="shrink-0 rounded p-1 text-muted hover:bg-cream hover:text-foreground"
                >
                  <IconTrash className="size-4" stroke={1.75} />
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
      </div>
      ) : null}
    </section>

    {previewMedia ? (
      <ResearchMediaPreviewDialog
        media={previewMedia}
        url={previewUrl}
        onClose={closePreview}
      />
    ) : null}
    </>
  );
}
