"use client";

import {
  IconArchive,
  IconCheck,
  IconFolder,
  IconHistory,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProjectArchiveCount } from "@/lib/artifacts/fetchProjectArchiveCount";
import { useT } from "@/hooks/useT";
import { archiveStageNavLabel } from "@/lib/artifacts/archiveArtifactLabels";
import { useUiLocale } from "@/hooks/useUiLocale";
import {
  getMacroGroupStatus,
  getSidebarStage,
  SIDEBAR_MACRO_GROUPS,
  STAGE_COUNT,
  type MacroGroupStatus,
} from "@/lib/stages/sidebarNav";
import { getStageNavDescription } from "@/lib/stages/stageNavDescriptions";
import type { MessageKey } from "@/lib/i18n/messages";

const MACRO_MESSAGE_KEYS: Record<string, MessageKey> = {
  empathize: "macro.empathize",
  analyze: "macro.analyze",
  ideate: "macro.ideate",
  prototype: "macro.prototype",
  business: "macro.business",
};

const SIDEBAR_COLLAPSED_KEY = "spotlight-sidebar-collapsed";

interface ProjectStageSidebarProps {
  projectId: string;
  currentStage: number;
  maxReachedStage: number;
  completedStages: number[];
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  archiveActive?: boolean;
  archiveEntryCount?: number;
}

function StageNumberBadge({
  stage,
  isCurrent,
  isComplete,
  isServiceExtension,
  collapsed,
}: {
  stage: number;
  isCurrent: boolean;
  isComplete: boolean;
  isServiceExtension: boolean;
  collapsed: boolean;
}) {
  if (isComplete && !isCurrent) {
    return (
      <div className="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-badge-fill-ring bg-badge-fill">
        <IconCheck className="size-2.5 text-badge-on-fill" stroke={3} />
      </div>
    );
  }
  if (isCurrent) {
    return (
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-full bg-spotlight font-bold text-on-spotlight",
          collapsed ? "size-[22px] text-[10.5px]" : "size-[18px] text-[9px]",
        ].join(" ")}
      >
        {stage}
      </div>
    );
  }
  return (
    <div
      className={[
        "flex size-[18px] shrink-0 items-center justify-center rounded-full border border-border-warm bg-surface text-[9px] text-muted",
        isServiceExtension ? "border border-dotted border-spotlight" : "border border-border-warm",
      ].join(" ")}
    >
      {stage}
    </div>
  );
}

function MacroDivider({
  status,
  collapsed,
}: {
  status: MacroGroupStatus;
  collapsed: boolean;
}) {
  if (collapsed) {
    return (
      <div
        className={[
          "my-1 h-1 w-9 rounded-sm",
          status === "complete"
            ? "bg-badge-fill"
            : status === "in_progress"
              ? "bg-spotlight"
              : "bg-border-warm",
        ].join(" ")}
        aria-hidden
      />
    );
  }
  return null;
}

function SidebarStageRow({
  projectId,
  stageId,
  navLabel,
  isServiceExtension,
  isCurrent,
  isComplete,
  collapsed,
}: {
  projectId: string;
  stageId: number;
  navLabel: string;
  isServiceExtension: boolean;
  isCurrent: boolean;
  isComplete: boolean;
  collapsed: boolean;
}) {
  const description = getStageNavDescription(stageId);
  const href = `/project/${projectId}/stage/${stageId}`;

  const rowClass = [
    "group relative flex items-center rounded-md transition-colors",
    collapsed
      ? isCurrent
        ? "h-[30px] w-11 justify-center rounded-r-md border-l-[3px] border-spotlight bg-yellow-tint"
        : "h-7 w-9 justify-center px-0 hover:bg-cream"
      : "gap-2 px-2.5 py-1.5",
    !collapsed && isCurrent
      ? "border-l-[3px] border-spotlight bg-yellow-tint pl-2"
      : !collapsed
        ? "hover:bg-cream"
        : "",
  ].join(" ");

  const label = collapsed
    ? null
    : isCurrent
      ? navLabel
      : `${stageId} · ${navLabel}`;

  const content = (
    <>
      <StageNumberBadge
        stage={stageId}
        isCurrent={isCurrent}
        isComplete={isComplete}
        isServiceExtension={isServiceExtension}
        collapsed={collapsed}
      />
      {!collapsed && label ? (
        <span
          className={[
            "text-[11px] leading-snug",
            isCurrent ? "font-semibold text-foreground" : isComplete ? "text-foreground" : "text-muted",
          ].join(" ")}
        >
          {label}
        </span>
      ) : null}
      <div
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 w-[min(200px,70vw)] -translate-y-1/2 rounded-md border border-badge-fill-ring bg-tooltip-bg px-2.5 py-2 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <div className="text-[10px] font-semibold text-badge-on-fill">
          {stageId} · {description.title}
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-tooltip-fg/90">
          {description.summary}
        </p>
      </div>
    </>
  );

  return (
    <Link
      href={href}
      className={rowClass}
      aria-current={isCurrent ? "step" : undefined}
    >
      {content}
    </Link>
  );
}

export function ProjectStageSidebar({
  projectId,
  currentStage,
  maxReachedStage,
  completedStages,
  collapsed,
  onCollapsedChange,
  archiveActive = false,
  archiveEntryCount: archiveEntryCountProp,
}: ProjectStageSidebarProps) {
  const t = useT();
  const locale = useUiLocale();
  const [archiveCount, setArchiveCount] = useState<number | null>(
    archiveEntryCountProp ?? null,
  );

  useEffect(() => {
    if (archiveEntryCountProp != null) {
      setArchiveCount(archiveEntryCountProp);
      return;
    }
    let cancelled = false;
    void fetchProjectArchiveCount(projectId).then((count) => {
      if (!cancelled) setArchiveCount(count);
    });
    return () => {
      cancelled = true;
    };
  }, [archiveEntryCountProp, projectId]);

  const archiveHref = `/project/${projectId}/archive`;
  const archiveBadge =
    archiveCount != null && archiveCount > 0 ? String(archiveCount) : undefined;

  const toggle = useCallback(() => {
    onCollapsedChange(!collapsed);
  }, [collapsed, onCollapsedChange]);

  const currentMeta = getSidebarStage(currentStage);
  const progressPct = Math.round((currentStage / STAGE_COUNT) * 100);

  const macroStatuses = useMemo(
    () =>
      SIDEBAR_MACRO_GROUPS.map((g) => ({
        id: g.id,
        status: getMacroGroupStatus(
          g.stages.map((s) => s.id),
          currentStage,
          completedStages,
          maxReachedStage,
        ),
        hasServiceDot: g.stages.some((s) => s.isServiceExtension),
      })),
    [currentStage, completedStages, maxReachedStage],
  );

  return (
    <aside
      className={[
        "sticky top-0 flex h-[calc(100vh-52px)] shrink-0 flex-col border-r border-border-warm bg-panel py-3.5 transition-[width] duration-200",
        collapsed ? "w-[60px] items-center" : "w-[244px]",
      ].join(" ")}
      aria-label="진행 단계"
    >
      <div
        className={[
          "flex items-center pb-3",
          collapsed ? "justify-center px-0" : "justify-between px-4",
        ].join(" ")}
      >
        {!collapsed ? (
          <div className="text-[9px] font-semibold tracking-wide text-muted uppercase">
            진행 자리
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggle}
          className="rounded p-0.5 text-muted transition-colors hover:text-foreground"
          aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          {collapsed ? (
            <IconLayoutSidebarLeftExpand className="size-[17px]" stroke={1.75} />
          ) : (
            <IconLayoutSidebarLeftCollapse className="size-3.5" stroke={1.75} />
          )}
        </button>
      </div>

      <div className={collapsed ? "mb-3 px-2" : "mb-2.5 px-2.5"}>
        <div
          className={[
            "rounded-lg border border-spotlight bg-yellow-tint",
            collapsed ? "flex flex-col items-center gap-0.5 px-1.5 py-1.5" : "px-2.5 py-2",
          ].join(" ")}
        >
          {!collapsed ? (
            <div className="mb-0.5 text-[8.5px] font-semibold tracking-wide text-gold">
              현재 자리
            </div>
          ) : null}
          {collapsed ? (
            <div className="flex size-6 items-center justify-center rounded-full bg-spotlight text-[10px] font-bold text-on-spotlight">
              {currentStage}
            </div>
          ) : (
            <div className="text-[11px] leading-snug font-semibold text-foreground">
              {t("stage.prefix")} {currentStage} ·{" "}
              {archiveStageNavLabel(currentStage, locale)}
            </div>
          )}
          <div
            className={[
              "flex items-center gap-1",
              collapsed ? "mt-0.5" : "mt-1.5",
            ].join(" ")}
          >
            {!collapsed ? (
              <div className="h-[3px] flex-1 overflow-hidden rounded-sm bg-surface">
                <div
                  className="h-full rounded-sm bg-spotlight transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            ) : null}
            <span className="text-[9px] font-semibold text-gold">
              {currentStage}/{STAGE_COUNT}
            </span>
          </div>
        </div>
      </div>

      <div
        className={[
          "flex-1 overflow-y-auto",
          collapsed ? "flex w-full flex-col items-center gap-0.5 px-1.5" : "px-2",
        ].join(" ")}
      >
        {SIDEBAR_MACRO_GROUPS.map((group, groupIndex) => {
          const status =
            macroStatuses.find((m) => m.id === group.id)?.status ?? "upcoming";
          const MacroIcon = group.icon;
          const macroLabel =
            (MACRO_MESSAGE_KEYS[group.id]
              ? t(MACRO_MESSAGE_KEYS[group.id]!)
              : group.label) +
            (status === "complete"
              ? t("macro.complete")
              : status === "in_progress"
                ? t("macro.inProgress")
                : "");
          const hasServiceDot = group.stages.some((s) => s.isServiceExtension);

          return (
            <div
              key={group.id}
              className={collapsed ? "flex w-full flex-col items-center" : "mb-2"}
            >
              {collapsed ? (
                <>
                  <MacroDivider status={status} collapsed />
                  <div
                    className="group/macro relative my-1 flex size-10 items-center justify-center rounded-md"
                    title={macroLabel}
                  >
                    <MacroIcon
                      className={[
                        "size-[18px]",
                        status === "in_progress"
                          ? "text-gold"
                          : status === "complete"
                            ? "text-foreground"
                            : "text-muted",
                      ].join(" ")}
                      stroke={1.75}
                    />
                    <div className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 whitespace-nowrap rounded border border-badge-fill-ring bg-tooltip-bg px-2 py-1 text-[9.5px] text-tooltip-fg opacity-0 transition-opacity group-hover/macro:opacity-100">
                      {macroLabel}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mb-1 flex items-center gap-1 px-2 py-1">
                  <MacroIcon
                    className={[
                      "size-[14px]",
                      status === "in_progress" ? "text-gold" : "text-muted",
                    ].join(" ")}
                    stroke={1.75}
                  />
                  <span
                    className={[
                      "text-[12px] font-semibold tracking-wide",
                      status === "in_progress"
                        ? "text-gold"
                        : status === "complete"
                          ? "text-muted"
                          : "text-muted",
                    ].join(" ")}
                  >
                    {macroLabel}
                  </span>
                  <div
                    className={[
                      "ml-0.5 h-px flex-1",
                      status === "in_progress" ? "bg-spotlight" : "bg-border-warm",
                    ].join(" ")}
                  />
                  {hasServiceDot && status === "upcoming" ? (
                    <div
                      className="size-1.5 shrink-0 rounded-full border border-dotted border-gold bg-spotlight"
                      title="서비스 확장 단계"
                      aria-hidden
                    />
                  ) : null}
                </div>
              )}

              <div
                className={
                  collapsed ? "flex flex-col items-center gap-0" : "flex flex-col"
                }
              >
                {group.stages.map((stage) => {
                  const isCurrent = stage.id === currentStage;
                  const isComplete = completedStages.includes(stage.id);
                  const navLabel = archiveStageNavLabel(stage.id, locale);

                  return (
                    <SidebarStageRow
                      key={stage.id}
                      projectId={projectId}
                      stageId={stage.id}
                      navLabel={navLabel}
                      isServiceExtension={stage.isServiceExtension}
                      isCurrent={isCurrent}
                      isComplete={isComplete}
                      collapsed={collapsed}
                    />
                  );
                })}
              </div>

              {groupIndex < SIDEBAR_MACRO_GROUPS.length - 1 && !collapsed ? (
                <div className="h-1" aria-hidden />
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        className={[
          "mt-2 border-t border-border-warm pt-2.5",
          collapsed ? "flex flex-col items-center gap-1 px-0" : "px-3",
        ].join(" ")}
      >
        {[
          {
            icon: IconArchive,
            label: t("sidebar.archive"),
            badge: archiveBadge,
            href: archiveHref,
            active: archiveActive,
          },
          { icon: IconHistory, label: locale === "en" ? "Coach memory" : "코치 메모리", href: "#" },
          { icon: IconFolder, label: t("sidebar.myProjects"), href: "/home" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={[
              "relative flex items-center rounded-md transition-colors",
              item.active
                ? "bg-[#FFFDF4] font-semibold text-foreground"
                : "text-foreground hover:bg-cream",
              collapsed ? "size-9 justify-center" : "gap-2.5 px-2 py-1.5",
            ].join(" ")}
            aria-current={item.active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="size-3.5" stroke={1.75} />
            {!collapsed ? (
              <>
                <span className="text-[11px]">{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded bg-cream px-1 py-px text-[9.5px] text-muted">
                    {item.badge}
                  </span>
                ) : null}
              </>
            ) : item.badge ? (
              <span className="absolute top-0.5 right-0.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-spotlight px-0.5 text-[8px] font-bold text-on-spotlight">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </aside>
  );
}

export function readSidebarCollapsedPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

export function writeSidebarCollapsedPreference(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
}
