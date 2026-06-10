import {
  IconBell,
  IconChevronDown,
  IconLemon2,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { brandScript } from "@/lib/fonts/brand";

export type TopNavItem = "home" | "projects" | "archive" | "invest";

const NAV_LINKS: { id: TopNavItem; label: string; href: string }[] = [
  { id: "home", label: "홈", href: "/home" },
  { id: "projects", label: "프로젝트", href: "/home#projects" },
  { id: "archive", label: "자료실", href: "/home#archive" },
  { id: "invest", label: "투자·지원", href: "/home#programs" },
];

export interface TopNavProps {
  active?: TopNavItem;
  userName?: string;
  userInitial?: string;
  notificationCount?: number;
}

export function TopNav({
  active = "home",
  userName = "민호",
  userInitial = "민",
  notificationCount = 3,
}: TopNavProps) {
  return (
    <header className="flex items-center gap-[18px] border-b border-border-warm bg-panel px-[22px] py-3">
      <Link href="/home" className="flex items-center gap-2">
        <div className="flex size-[26px] items-center justify-center rounded-md border border-badge-fill-ring bg-badge-fill">
          <IconLemon2 className="size-3.5 text-badge-on-fill" stroke={2} />
        </div>
        <span
          className={`${brandScript.className} -skew-x-6 text-[22px] leading-none italic text-foreground`}
        >
          Spotlight
        </span>
      </Link>

      <nav
        className="ml-3.5 flex items-center gap-4"
        aria-label="시스템 메뉴"
      >
        {NAV_LINKS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={[
              "text-[11.5px]",
              item.id === active
                ? "font-semibold text-foreground"
                : "text-muted transition-colors hover:text-foreground",
            ].join(" ")}
            aria-current={item.id === active ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1" aria-hidden />

      <div className="flex min-w-[200px] items-center gap-1.5 rounded-md border border-border-warm bg-cream px-[11px] py-1.5">
        <IconSearch className="size-3.5 shrink-0 text-muted" stroke={2} />
        <span className="flex-1 text-[11px] text-subtle">
          프로젝트·자료실·프로그램 검색…
        </span>
        <kbd className="rounded border border-border-warm bg-panel px-[5px] py-px text-[9.5px] text-muted">
          ⌘ K
        </kbd>
      </div>

      <ThemeToggle />

      <button
        type="button"
        className="relative p-1 text-foreground"
        aria-label={`알림 ${notificationCount}건`}
      >
        <IconBell className="size-[18px]" stroke={1.75} />
        {notificationCount > 0 && (
          <span className="absolute -top-0.5 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border-[1.5px] border-panel bg-spotlight px-0.5 text-[8.5px] font-bold text-on-spotlight">
            {notificationCount}
          </span>
        )}
      </button>

      <button
        type="button"
        className="flex items-center gap-[7px] rounded-full border border-border-warm bg-cream py-1 pr-2.5 pl-1"
        aria-label="사용자 메뉴"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-spotlight text-xs font-semibold text-on-spotlight">
          {userInitial}
        </span>
        <span className="text-[11px] font-medium text-foreground">{userName}</span>
        <IconChevronDown className="size-[11px] text-muted" stroke={2} />
      </button>
    </header>
  );
}
