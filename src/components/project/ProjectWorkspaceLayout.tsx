"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  ProjectStageSidebar,
  readSidebarCollapsedPreference,
  writeSidebarCollapsedPreference,
} from "@/components/project/ProjectStageSidebar";

interface ProjectWorkspaceLayoutProps {
  projectId: string;
  currentStage: number;
  maxReachedStage: number;
  completedStages: number[];
  children: ReactNode;
}

export function ProjectWorkspaceLayout({
  projectId,
  currentStage,
  maxReachedStage,
  completedStages,
  children,
}: ProjectWorkspaceLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(readSidebarCollapsedPreference());
    setHydrated(true);
  }, []);

  const onCollapsedChange = useCallback((next: boolean) => {
    setCollapsed(next);
    writeSidebarCollapsedPreference(next);
  }, []);

  return (
    <div className="grid min-h-[calc(100vh-52px)] grid-cols-1 bg-background lg:grid-cols-[auto_1fr]">
      <div
        className={[
          "hidden lg:block",
          !hydrated ? "w-[244px]" : collapsed ? "w-[60px]" : "w-[244px]",
        ].join(" ")}
      >
        <ProjectStageSidebar
          projectId={projectId}
          currentStage={currentStage}
          maxReachedStage={maxReachedStage}
          completedStages={completedStages}
          collapsed={hydrated ? collapsed : false}
          onCollapsedChange={onCollapsedChange}
        />
      </div>

      <div
        data-workspace-main-scroll
        className="min-w-0 overflow-y-auto bg-background"
      >
        {children}
      </div>
    </div>
  );
}
