"use client";

import { IconTrash } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { ProjectHubDeleteConfirmDialog } from "@/components/hub/ProjectHubDeleteConfirmDialog";
import { deleteProjectAction } from "@/lib/projects/deleteProject";

interface ProjectHubDeleteButtonProps {
  projectId: string;
  projectTitle: string;
  onDeleted: (projectId: string) => void;
  className?: string;
}

export function ProjectHubDeleteButton({
  projectId,
  projectTitle,
  onDeleted,
  className = "",
}: ProjectHubDeleteButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpenConfirm = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (loading) return;
    setConfirmOpen(false);
  }, [loading]);

  const handleConfirmDelete = useCallback(async () => {
    setLoading(true);
    try {
      const result = await deleteProjectAction(projectId);
      if (result.ok) {
        setConfirmOpen(false);
        onDeleted(projectId);
      } else {
        window.alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, onDeleted]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={loading}
        className={[
          "inline-flex items-center justify-center gap-1 rounded-md border border-border-warm bg-panel px-3 py-1.5 text-[10.5px] text-muted transition-colors hover:border-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className,
        ].join(" ")}
        aria-label={`${projectTitle} 프로젝트 삭제`}
        aria-haspopup="dialog"
      >
        <IconTrash className="size-3.5" stroke={1.75} aria-hidden />
        삭제
      </button>

      <ProjectHubDeleteConfirmDialog
        open={confirmOpen}
        projectTitle={projectTitle}
        loading={loading}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancel}
      />
    </>
  );
}
