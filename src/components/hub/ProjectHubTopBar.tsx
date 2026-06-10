import {
  IconBell,
  IconChevronDown,
  IconSearch,
} from "@tabler/icons-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
interface ProjectHubTopBarProps {
  userName?: string;
  userInitial?: string;
  notificationCount?: number;
}

/** 컷 21 · 프로젝트 허브 GNB */
export function ProjectHubTopBar({
  userName = "민호",
  userInitial = "민",
  notificationCount = 3,
}: ProjectHubTopBarProps) {
  return (
    <header className="flex items-center gap-3.5 border-b border-border-warm bg-panel px-[18px] py-[11px]">
      <div className="flex items-center gap-2">
        <div className="flex size-[26px] items-center justify-center rounded-md border border-badge-fill-ring bg-badge-fill text-[11px] font-bold text-badge-on-fill">
          H
        </div>
        <span className="text-[12.5px] font-semibold text-foreground">
          HiDD 디자인씽킹
        </span>
      </div>

      <div className="flex flex-1 justify-center">
        <div className="flex min-w-[280px] max-w-md flex-1 items-center gap-1.5 rounded-md border border-border-warm bg-cream px-3 py-1.5 lg:max-w-lg">
          <IconSearch className="size-[13px] shrink-0 text-subtle" stroke={2} />
          <span className="flex-1 text-[10.5px] text-subtle">
            프로젝트·자료실·메모리에서 검색
          </span>
          <kbd className="rounded border border-border-warm bg-panel px-1 py-px font-mono text-[9.5px] text-subtle">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        <button
          type="button"
          className="relative flex size-8 items-center justify-center rounded-md bg-cream"
          aria-label={`알림 ${notificationCount}건`}
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
          aria-label="사용자 메뉴"
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
