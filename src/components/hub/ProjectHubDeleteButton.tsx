"use client";

import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ProjectHubDeleteConfirmDialog } from "@/components/hub/ProjectHubDeleteConfirmDialog";
import { deleteProjectAction } from "@/lib/projects/deleteProject";

interface ProjectHubDeleteButtonProps {
  projectId: string;
  projectTitle: string;
  onDeleted: (projectId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ProjectHubDeleteButton({
  projectId,
  projectTitle,
  onDeleted,
  className = "",
  disabled = false,
}: ProjectHubDeleteButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpenConfirm = useCallback(() => {
    if (disabled || loading) return;
    setConfirmOpen(true);
  }, [disabled, loading]);

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
        router.refresh();
      } else {
        window.alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [onDeleted, projectId, router]);

  if (disabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={loading}
        className={[
          "inline-flex items-center justify-center gap-1 rounded-md border border-border-warm bg-panel px-3 py-1.5 text-[10.5px] text-muted transition-colors hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50",
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
