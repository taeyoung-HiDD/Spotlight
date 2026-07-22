import { IconHome } from "@tabler/icons-react";
import Link from "next/link";
import {
  WORKSPACE_HOME_PAGE_NAME,
  WORKSPACE_HOME_PAGE_NAME_EN,
} from "@/lib/navigation/stageNavLabels";

type WorkspaceHomeLinkProps = {
  className?: string;
  showLabel?: boolean;
};

/** 작업 GNB 맨 좌측 — 내 프로젝트(컷 21) */
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
      aria-label={`${WORKSPACE_HOME_PAGE_NAME}로`}
      title={`${WORKSPACE_HOME_PAGE_NAME_EN} · ${WORKSPACE_HOME_PAGE_NAME}`}
    >
      <IconHome className="size-[18px]" stroke={1.75} aria-hidden />
      {showLabel ? (
        <span className="text-[11px] font-medium text-foreground">
          {WORKSPACE_HOME_PAGE_NAME_EN}
        </span>
      ) : null}
    </Link>
  );
}
