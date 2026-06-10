"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { pushWorkspaceVisit } from "@/lib/navigation/workspaceVisitHistory";

/** 마운트 시 현재 경로를 프로젝트 방문 기록에 추가 */
export function RecordWorkspaceVisit({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const path =
      pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "");
    pushWorkspaceVisit(projectId, path);
  }, [pathname, projectId, searchParams]);

  return null;
}
