"use client";

import { useEffect, useId, useRef } from "react";

interface ProjectHubDeleteConfirmDialogProps {
  open: boolean;
  projectTitle: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 프로젝트 삭제 2차 확인 팝업 */
export function ProjectHubDeleteConfirmDialog({
  open,
  projectTitle,
  loading = false,
  onConfirm,
  onCancel,
}: ProjectHubDeleteConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-zone-cell-bg/55" aria-hidden />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-[400px] rounded-xl border border-border-warm bg-panel p-6 shadow-[0_12px_40px_rgba(45,45,42,0.18)]"
      >
        <h2
          id={titleId}
          className="mb-2 text-base font-semibold leading-snug text-foreground"
        >
          프로젝트를 삭제할까요?
        </h2>
        <p id={descId} className="mb-1 text-sm leading-relaxed text-foreground">
          <span className="font-medium">「{projectTitle}」</span>
        </p>
        <p className="mb-6 text-[13px] leading-relaxed text-muted">
          삭제하면 단계 자료와 대화 기록을 되돌릴 수 없어요. 정말 삭제하시겠어요?
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-border-warm bg-panel px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-cream disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md bg-hub-cta-bg px-4 py-2.5 text-sm font-medium text-hub-cta-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "삭제 중…" : "삭제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
