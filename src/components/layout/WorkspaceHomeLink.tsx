import { IconHome } from "@tabler/icons-react";
import Link from "next/link";

type WorkspaceHomeLinkProps = {
  className?: string;
  showLabel?: boolean;
};

/** 작업 GNB 맨 좌측 — 프로젝트 허브(컷 21) */
export function WorkspaceHomeLink({
  className = "",
  showLabel = false,
}: WorkspaceHomeLinkProps) {
  return (
    <Link
      href="/home"
      className={[
        "flex shrink-0 items-center gap-1.5 rounded-md text-muted transition-colors hover:bg-cream hover:text-foreground",
        showLabel ? "px-2 py-1" : "size-8 justify-center",
        className,
      ].join(" ")}
      aria-label="프로젝트 허브로"
      title="Home · 프로젝트 허브"
    >
      <IconHome className="size-[18px]" stroke={1.75} aria-hidden />
      {showLabel ? (
        <span className="text-[11px] font-medium text-foreground">Home</span>
      ) : null}
    </Link>
  );
}
