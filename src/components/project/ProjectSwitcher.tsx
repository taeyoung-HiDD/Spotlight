"use client";

import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UserProjectListItem } from "@/lib/projects/fetchUserProjects";

interface ProjectSwitcherProps {
  projectId: string;
  projectTitle: string;
  projects: UserProjectListItem[];
}

function projectInitial(title: string): string {
  const t = title.trim();
  if (!t) return "P";
  return t.charAt(0).toUpperCase();
}

export function ProjectSwitcher({
  projectId,
  projectTitle,
  projects,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const switchProject = (id: string) => {
    close();
    if (id === projectId) return;
    const stageMatch = pathname?.match(/\/stage\/(\d+)/);
    const stage = stageMatch?.[1] ?? "1";
    router.push(`/project/${id}/stage/${stage}`);
  };

  const list =
    projects.length > 0
      ? projects
      : [{ id: projectId, title: projectTitle, current_phase: null }];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md py-0.5 pr-1 transition-colors hover:bg-cream"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="프로젝트 전환"
      >
        <div className="flex size-[26px] items-center justify-center rounded-md border border-badge-fill-ring bg-badge-fill text-[11px] font-bold text-badge-on-fill">
          {projectInitial(projectTitle)}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[12.5px] font-semibold text-foreground">
            {projectTitle}
          </span>
          <span className="text-[10px] text-muted">· Spotlight</span>
        </div>
        <IconChevronDown
          className={[
            "size-3 text-muted transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          stroke={2}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[240px] overflow-hidden rounded-lg border border-border-warm bg-panel py-1 shadow-lg"
        >
          {list.map((p) => {
            const active = p.id === projectId;
            return (
              <li key={p.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => switchProject(p.id)}
                  className={[
                    "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors",
                    active ? "bg-yellow-tint" : "hover:bg-cream",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-[11.5px]",
                      active ? "font-semibold text-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {p.title}
                  </span>
                  {p.current_phase ? (
                    <span className="text-[9.5px] text-muted">{p.current_phase}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
          <li className="mt-1 border-t border-border-warm pt-1">
            <Link
              href="/project/new"
              onClick={close}
              className="block px-3 py-2 text-[11px] font-medium text-muted transition-colors hover:bg-cream hover:text-foreground"
            >
              + 새 프로젝트
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
