"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserProjectListItem } from "@/lib/projects/fetchUserProjects";

type ProjectWorkspaceContextValue = {
  projectId: string;
  projectTitle: string;
  projects: UserProjectListItem[];
  setProjectTitle: (title: string) => void;
};

const ProjectWorkspaceContext =
  createContext<ProjectWorkspaceContextValue | null>(null);

interface ProjectWorkspaceProviderProps {
  projectId: string;
  initialTitle: string;
  initialProjects: UserProjectListItem[];
  children: ReactNode;
}

/** 작업 화면 GNB · 프로젝트 전환 — 제목을 클라이언트에서 갱신 */
export function ProjectWorkspaceProvider({
  projectId,
  initialTitle,
  initialProjects,
  children,
}: ProjectWorkspaceProviderProps) {
  const [projectTitle, setProjectTitleState] = useState(initialTitle);
  const [projects, setProjects] = useState(initialProjects);

  useEffect(() => {
    setProjectTitleState(initialTitle);
  }, [projectId, initialTitle]);

  useEffect(() => {
    setProjects(initialProjects);
  }, [projectId, initialProjects]);

  const setProjectTitle = useCallback(
    (title: string) => {
      setProjectTitleState(title);
      const trimmed = title.trim();
      if (trimmed) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, title: trimmed } : p,
          ),
        );
      }
    },
    [projectId],
  );

  const value = useMemo(
    () => ({
      projectId,
      projectTitle,
      projects,
      setProjectTitle,
    }),
    [projectId, projectTitle, projects, setProjectTitle],
  );

  return (
    <ProjectWorkspaceContext.Provider value={value}>
      {children}
    </ProjectWorkspaceContext.Provider>
  );
}

export function useProjectWorkspace(): ProjectWorkspaceContextValue {
  const ctx = useContext(ProjectWorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useProjectWorkspace must be used within ProjectWorkspaceProvider",
    );
  }
  return ctx;
}
