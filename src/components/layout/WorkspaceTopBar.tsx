"use client";

import {
  IconBell,
  IconChevronDown,
  IconSearch,
} from "@tabler/icons-react";
import { LocaleToggle } from "@/components/layout/LocaleToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { WorkspaceHomeLink } from "@/components/layout/WorkspaceHomeLink";
import { ProjectSwitcher } from "@/components/project/ProjectSwitcher";
import { useT } from "@/hooks/useT";
import type { UserProjectListItem } from "@/lib/projects/fetchUserProjects";

interface WorkspaceTopBarProps {
  projectId: string;
  projectTitle: string;
  projects: UserProjectListItem[];
  userName?: string;
  userInitial?: string;
  notificationCount?: number;
}

/** 컷 9 · 작업 화면 상단 — 프로젝트 전환 + 검색 + 사용자 */
export function WorkspaceTopBar({
  projectId,
  projectTitle,
  projects,
  userName = "민호",
  userInitial = "민",
  notificationCount = 3,
}: WorkspaceTopBarProps) {
  const t = useT();

  return (
    <header className="flex items-center gap-2.5 border-b border-border-warm bg-panel px-[18px] py-[11px]">
      <WorkspaceHomeLink />
      <div className="h-6 w-px shrink-0 bg-border-warm" aria-hidden />
      <ProjectSwitcher
        projectId={projectId}
        projectTitle={projectTitle}
        projects={projects}
      />

      <div className="flex flex-1 justify-center">
        <div className="flex min-w-[280px] max-w-md flex-1 items-center gap-1.5 rounded-md border border-border-warm bg-cream px-3 py-1.5 lg:max-w-lg">
          <IconSearch className="size-[13px] shrink-0 text-subtle" stroke={2} />
          <span className="flex-1 text-[10.5px] text-subtle">
            {t("nav.search.workspace")}
          </span>
          <kbd className="rounded border border-border-warm bg-panel px-1 py-px font-mono text-[9.5px] text-subtle">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <LocaleToggle />
        <ThemeToggle />
        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-md bg-cream"
          aria-label={`${t("nav.notifications")} ${notificationCount}`}
        >
          <IconBell className="size-4 text-foreground" stroke={1.75} />
          {notificationCount > 0 ? (
            <span className="absolute top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-spotlight px-0.5 text-[9px] font-bold text-on-spotlight">
              {notificationCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full bg-cream py-1 pr-2.5 pl-1"
          aria-label={t("nav.userMenu")}
        >
          <span className="flex size-[26px] items-center justify-center rounded-full bg-spotlight text-[11px] font-bold text-on-spotlight">
            {userInitial}
          </span>
          <span className="text-[10.5px] font-medium text-foreground">{userName}</span>
          <IconChevronDown className="size-[11px] text-muted" stroke={2} />
        </button>
      </div>
    </header>
  );
}
