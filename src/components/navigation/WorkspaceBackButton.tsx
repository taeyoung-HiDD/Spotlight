"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import {
  getStagePageName,
  pageNameFromVisitPath,
  parseStageIdFromPath,
  WORKSPACE_HOME_PAGE_NAME,
} from "@/lib/navigation/stageNavLabels";
import {
  peekPreviousWorkspaceVisit,
  popPreviousWorkspaceVisit,
} from "@/lib/navigation/workspaceVisitHistory";
import { stageBtnSecondary } from "@/lib/stages/ui";

interface WorkspaceBackButtonProps {
  projectId: string;
  /** 방문 기록·브라우저 뒤로가기가 없을 때 */
  fallbackHref?: string;
  /** fallbackHref 대신 단계 번호로 경로·라벨 지정 */
  fallbackStageId?: number;
  /** 단계 내 이전 화면(같은 URL) — true면 기본 뒤로가기 생략 */
  onInternalBack?: () => boolean;
  /** 이전 화면 활동명 (단계 내 하위 화면 등) */
  backPageName?: string;
  /** 지정 시 한 줄 라벨(레거시) */
  label?: string;
  className?: string;
}

function resolveBackPageName(
  projectId: string,
  currentPath: string,
  options: {
    backPageName?: string;
    resolvedFallbackHref?: string;
    fallbackStageId?: number;
  },
): string | null {
  if (options.backPageName) return options.backPageName;

  const prev = peekPreviousWorkspaceVisit(projectId, currentPath);
  const prevName = prev ? pageNameFromVisitPath(prev) : null;
  if (prevName) return prevName;

  if (options.resolvedFallbackHref === "/home") {
    return WORKSPACE_HOME_PAGE_NAME;
  }

  const fallbackStage = options.resolvedFallbackHref
    ? parseStageIdFromPath(options.resolvedFallbackHref)
    : options.fallbackStageId ?? null;
  if (fallbackStage) return getStagePageName(fallbackStage);

  return null;
}

function BackButtonFace({
  pageName,
  label,
  className,
  disabled,
  onClick,
}: {
  pageName: string | null;
  label?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  if (label) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className ?? stageBtnSecondary}
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
      className={`${className ?? stageBtnSecondary} inline-flex min-w-[9.5rem] flex-col items-center gap-0.5 py-2 text-center break-keep`}
      title={pageName ?? undefined}
    >
      <span className="text-[16px] font-semibold leading-tight">← 이전 페이지로</span>
      {pageName ? (
        <span className="text-[12px] font-medium leading-snug text-muted">
          {pageName}
        </span>
      ) : null}
    </button>
  );
}

function WorkspaceBackButtonInner({
  projectId,
  fallbackHref,
  fallbackStageId,
  onInternalBack,
  backPageName,
  label,
  className,
}: WorkspaceBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolvedFallbackHref =
    fallbackHref ??
    (fallbackStageId != null
      ? `/project/${projectId}/stage/${fallbackStageId}`
      : undefined);

  const currentPath =
    pathname +
    (searchParams.toString() ? `?${searchParams.toString()}` : "");

  const resolvedPageName = useMemo(
    () =>
      label
        ? null
        : resolveBackPageName(projectId, currentPath, {
            backPageName,
            resolvedFallbackHref,
            fallbackStageId,
          }),
    [
      backPageName,
      currentPath,
      fallbackStageId,
      label,
      projectId,
      resolvedFallbackHref,
    ],
  );

  const handleClick = useCallback(() => {
    if (onInternalBack?.()) return;

    const prev = popPreviousWorkspaceVisit(projectId, currentPath);
    if (prev) {
      router.push(prev);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    if (resolvedFallbackHref) {
      router.push(resolvedFallbackHref);
    }
  }, [
    currentPath,
    onInternalBack,
    projectId,
    resolvedFallbackHref,
    router,
  ]);

  return (
    <BackButtonFace
      pageName={resolvedPageName}
      label={label}
      className={className}
      onClick={handleClick}
    />
  );
}

/** 직전에 본 워크스페이스 화면으로 이동 */
export function WorkspaceBackButton(props: WorkspaceBackButtonProps) {
  const resolvedFallbackHref =
    props.fallbackHref ??
    (props.fallbackStageId != null
      ? `/project/${props.projectId}/stage/${props.fallbackStageId}`
      : undefined);

  const suspensePageName = props.label
    ? null
    : resolveBackPageName(props.projectId, "", {
        backPageName: props.backPageName,
        resolvedFallbackHref,
        fallbackStageId: props.fallbackStageId,
      });

  return (
    <Suspense
      fallback={
        <BackButtonFace
          pageName={suspensePageName}
          label={props.label}
          className={props.className}
          disabled
        />
      }
    >
      <WorkspaceBackButtonInner {...props} />
    </Suspense>
  );
}
