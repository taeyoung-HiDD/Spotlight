"use client";

import { getStagePageName } from "@/lib/navigation/stageNavLabels";
import { stageBtnPrimary } from "@/lib/stages/ui";

interface WorkspaceForwardButtonProps {
  /** 이동 대상 단계 — 하단에 활동명 표시 */
  stageId?: number;
  /** stageId 대신 직접 페이지 이름 지정 */
  pageName?: string;
  /** 지정 시 한 줄 라벨(레거시) */
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function WorkspaceForwardButton({
  stageId,
  pageName,
  label,
  onClick,
  disabled,
  className,
}: WorkspaceForwardButtonProps) {
  const resolvedPageName =
    pageName ?? (stageId != null ? getStagePageName(stageId) : null);

  if (label) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className ?? stageBtnPrimary}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${className ?? stageBtnPrimary} inline-flex min-w-[9.5rem] flex-col items-center gap-0.5 py-2 text-center break-keep`}
      title={resolvedPageName ?? undefined}
    >
      <span className="text-[16px] font-semibold leading-tight">다음 페이지로 →</span>
      {resolvedPageName ? (
        <span className="text-[12px] font-medium leading-snug text-on-spotlight/90">
          {resolvedPageName}
        </span>
      ) : null}
    </button>
  );
}
