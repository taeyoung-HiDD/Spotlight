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
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";
import {
  resolveCoachingLevel,
  type GuidanceStyle,
} from "@/lib/stages/stage1/guidanceStyle";
import { fetchStage1CollectState } from "@/lib/artifacts/stage1Collect";
import type { UserProjectListItem } from "@/lib/projects/fetchUserProjects";

type ProjectWorkspaceContextValue = {
  projectId: string;
  projectTitle: string;
  projects: UserProjectListItem[];
  coachingLevel: UserCoachingLevel;
  guidanceStyle?: GuidanceStyle;
  /** 단계 1 artifact에서 코칭 레벨을 읽은 뒤 true — 가이드 게이트 판단 전 대기 */
  coachingLevelReady: boolean;
  setProjectTitle: (title: string) => void;
  setCoachingLevel: (level: UserCoachingLevel) => void;
  setGuidanceStyle: (style: GuidanceStyle) => void;
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
  const [coachingLevel, setCoachingLevelState] =
    useState<UserCoachingLevel>("beginner");
  const [guidanceStyle, setGuidanceStyleState] = useState<
    GuidanceStyle | undefined
  >();
  const [coachingLevelReady, setCoachingLevelReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCoachingLevelReady(false);
    void (async () => {
      try {
        const { state } = await fetchStage1CollectState(projectId);
        if (cancelled) return;
        if (state.guidanceStyle) {
          setGuidanceStyleState(state.guidanceStyle);
        }
        const level = resolveCoachingLevel(state);
        if (level) {
          setCoachingLevelState(level);
        }
      } catch {
        /* 기본 beginner */
      } finally {
        if (!cancelled) {
          setCoachingLevelReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

  const setCoachingLevel = useCallback((level: UserCoachingLevel) => {
    setCoachingLevelState(level);
    setCoachingLevelReady(true);
  }, []);

  const setGuidanceStyle = useCallback((style: GuidanceStyle) => {
    setGuidanceStyleState(style);
    setCoachingLevelReady(true);
  }, []);

  const value = useMemo(
    () => ({
      projectId,
      projectTitle,
      projects,
      coachingLevel,
      guidanceStyle,
      coachingLevelReady,
      setProjectTitle,
      setCoachingLevel,
      setGuidanceStyle,
    }),
    [
      projectId,
      projectTitle,
      projects,
      coachingLevel,
      guidanceStyle,
      coachingLevelReady,
      setProjectTitle,
      setCoachingLevel,
      setGuidanceStyle,
    ],
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

/** Provider 밖(랜딩 등)에서는 null */
export function useOptionalProjectWorkspace(): ProjectWorkspaceContextValue | null {
  return useContext(ProjectWorkspaceContext);
}
