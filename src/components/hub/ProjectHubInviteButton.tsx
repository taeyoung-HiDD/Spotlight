"use client";

import { IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { ProjectTeamInviteDialog } from "@/components/project/ProjectTeamInviteDialog";

interface ProjectHubInviteButtonProps {
  projectId: string;
  projectTitle: string;
  variant?: "primary" | "secondary";
}

/** 프로젝트 카드 · 팀원 초대 */
export function ProjectHubInviteButton({
  projectId,
  projectTitle,
  variant = "primary",
}: ProjectHubInviteButtonProps) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "primary"
      ? "inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-warm bg-panel px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-spotlight/50 hover:bg-cream sm:w-auto"
      : "w-full rounded-md border border-border-warm bg-panel px-3 py-1.5 text-center text-[10.5px] text-foreground sm:w-auto";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <IconUsers className="size-[13px] text-gold" stroke={2} aria-hidden />
        팀원 초대
      </button>
      <ProjectTeamInviteDialog
        open={open}
        projectId={projectId}
        projectTitle={projectTitle}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
