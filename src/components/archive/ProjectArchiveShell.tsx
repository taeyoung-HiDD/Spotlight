"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { WorkspaceTopBar } from "@/components/layout/WorkspaceTopBar";
import {
  ProjectWorkspaceProvider,
} from "@/components/project/ProjectWorkspaceContext";
import { ProjectWorkspaceLayout } from "@/components/project/ProjectWorkspaceLayout";
import { RecordWorkspaceVisit } from "@/components/navigation/RecordWorkspaceVisit";
import { writeClientMaxStage } from "@/lib/navigation/projectMaxStage";
import {
  completedStagesUpTo,
  resolveMaxReachedStage,
} from "@/lib/stages/resolveStageNavigation";
import { stageShell } from "@/lib/stages/ui";
import type { UserProjectListItem } from "@/lib/projects/fetchUserProjects";

interface ProjectArchiveShellProps {
  projectId: string;
  projectTitle: string;
  projects: UserProjectListItem[];
  artifactMaxStage: number;
  currentPhase: string | null;
  archiveEntryCount: number;
  children: ReactNode;
}

function ProjectArchiveShellInner({
  projectId,
  projectTitle,
  projects,
  artifactMaxStage,
  currentPhase,
  archiveEntryCount,
  children,
}: ProjectArchiveShellProps) {
  const [clientMaxStage, setClientMaxStage] = useState(0);

  useEffect(() => {
    setClientMaxStage(writeClientMaxStage(projectId, artifactMaxStage || 1));
  }, [artifactMaxStage, projectId]);

  const maxReachedStage = useMemo(
    () =>
      resolveMaxReachedStage({
        currentStage: artifactMaxStage || 1,
        artifactMaxStage,
        currentPhase,
        clientMaxStage,
      }),
    [artifactMaxStage, clientMaxStage, currentPhase],
  );

  const completedStages = useMemo(
    () => completedStagesUpTo(maxReachedStage),
    [maxReachedStage],
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={null}>
        <RecordWorkspaceVisit projectId={projectId} />
      </Suspense>
      <WorkspaceTopBar
        projectId={projectId}
        projectTitle={projectTitle}
        projects={projects}
      />
      <ProjectWorkspaceLayout
        projectId={projectId}
        currentStage={0}
        maxReachedStage={maxReachedStage}
        completedStages={completedStages}
        archiveActive
        archiveEntryCount={archiveEntryCount}
      >
        <main className={`${stageShell} py-4 lg:py-5`}>{children}</main>
      </ProjectWorkspaceLayout>
    </div>
  );
}

export function ProjectArchiveShell({
  projectId,
  projectTitle,
  projects,
  artifactMaxStage,
  currentPhase,
  archiveEntryCount,
  children,
}: ProjectArchiveShellProps) {
  return (
    <ProjectWorkspaceProvider
      projectId={projectId}
      initialTitle={projectTitle}
      initialProjects={projects}
    >
      <ProjectArchiveShellInner
        projectId={projectId}
        projectTitle={projectTitle}
        projects={projects}
        artifactMaxStage={artifactMaxStage}
        currentPhase={currentPhase}
        archiveEntryCount={archiveEntryCount}
      >
        {children}
      </ProjectArchiveShellInner>
    </ProjectWorkspaceProvider>
  );
}
