"use client";

import {
  StageGuideBody,
  StageGuideProvider,
  useStageGuide,
} from "@/components/layout/StageGuideGate";
import { WorkspaceTopBar } from "@/components/layout/WorkspaceTopBar";
import { IconBook2 } from "@tabler/icons-react";
import {
  ProjectWorkspaceProvider,
  useProjectWorkspace,
} from "@/components/project/ProjectWorkspaceContext";
import { ProjectWorkspaceLayout } from "@/components/project/ProjectWorkspaceLayout";
import { StageRevealItem } from "@/components/stage/motion/StageReveal";
import { useWorkspaceScrollOnEnter } from "@/lib/motion/pageEnterScroll";
import { STAGE_META } from "@/lib/stages/constants";
import type { UserProjectListItem } from "@/lib/projects/fetchUserProjects";
import { getSidebarStage } from "@/lib/stages/sidebarNav";
import {
  stageBadge,
  stageBtnSecondary,
  stageEyebrow,
  stagePageLead,
  stagePageTitle,
  stageShell,
} from "@/lib/stages/ui";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { RecordWorkspaceVisit } from "@/components/navigation/RecordWorkspaceVisit";
import { writeClientMaxStage } from "@/lib/navigation/projectMaxStage";
import {
  completedStagesUpTo,
  resolveMaxReachedStage,
} from "@/lib/stages/resolveStageNavigation";

interface ProjectStageShellProps {
  projectId: string;
  stageNum: number;
  projectTitle: string;
  projects: UserProjectListItem[];
  /** 프로젝트 artifact 중 최대 stage_id */
  artifactMaxStage: number;
  currentPhase: string | null;
  children: ReactNode;
}

const STAGE_SUBTITLES: Partial<Record<number, string>> = {
  1: " · 코치 첫 환영과 문제점·Hopes & Fears를 정리하는 자리예요.",
  2: " · 문제점 맥락을 사전 조사하고, 단계 3 To-know로 넘길 항목을 정리하는 단계예요.",
  3: " · 사용자 조사 전에 To-know list(질문 목록)를 작성·검토하는 단계예요.",
  5: " · 표면 아래 더 깊은 자리로 함께 내려가봐요. 디자인씽킹 코칭의 정수예요.",
};

function ProjectStageShellHeader({ stageNum }: { stageNum: number }) {
  const { guideReady, isBlocking, openGuide } = useStageGuide();
  const meta = STAGE_META[stageNum] ?? {
    label: `단계 ${stageNum}`,
    title: "작업",
    macro: "",
  };
  const sidebarStage = getSidebarStage(stageNum);

  return (
    <StageRevealItem index={0}>
      <div
        className={[
          "relative mb-4 rounded-2xl px-6 py-5 lg:px-7 lg:py-6",
          stageNum === 5
            ? "border-[1.5px] border-spotlight bg-panel"
            : "border border-border-warm bg-panel",
        ].join(" ")}
      >
        {stageNum === 5 ? (
          <span className="absolute -top-2.5 left-6 rounded bg-spotlight px-2.5 py-0.5 text-[12.5px] font-semibold tracking-wide text-charcoal">
            정수 자리
          </span>
        ) : null}
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className={stageEyebrow}>{meta.macro}</span>
          <span className={stageBadge}>단계 {stageNum}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className={stagePageTitle}>
            {sidebarStage?.navLabel ?? meta.title}
            {stageNum === 5 ? " · 니즈 분석하기" : ""}
          </h1>
          {guideReady && !isBlocking ? (
            <button
              type="button"
              onClick={openGuide}
              className={`${stageBtnSecondary} inline-flex shrink-0 items-center gap-1.5 text-[14px]`}
            >
              <IconBook2 className="size-4" stroke={2} aria-hidden />
              가이드 보기
            </button>
          ) : null}
        </div>
        <p className={stagePageLead}>
          {meta.label}
          {STAGE_SUBTITLES[stageNum] ?? null}
        </p>
      </div>
    </StageRevealItem>
  );
}

function ProjectStageShellInner({
  projectId,
  stageNum,
  artifactMaxStage,
  currentPhase,
  children,
}: Omit<ProjectStageShellProps, "projectTitle" | "projects">) {
  const { projectTitle, projects } = useProjectWorkspace();
  const [clientMaxStage, setClientMaxStage] = useState(0);

  useEffect(() => {
    setClientMaxStage(writeClientMaxStage(projectId, stageNum));
  }, [projectId, stageNum]);

  const maxReachedStage = useMemo(
    () =>
      resolveMaxReachedStage({
        currentStage: stageNum,
        artifactMaxStage,
        currentPhase,
        clientMaxStage,
      }),
    [artifactMaxStage, clientMaxStage, currentPhase, stageNum],
  );

  const completedStages = useMemo(
    () => completedStagesUpTo(maxReachedStage),
    [maxReachedStage],
  );

  useWorkspaceScrollOnEnter(stageNum);
  return (
    <StageGuideProvider stageNumber={stageNum}>
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
        currentStage={stageNum}
        maxReachedStage={maxReachedStage}
        completedStages={completedStages}
      >
        <main className={`${stageShell} py-4 lg:py-5`}>
          <ProjectStageShellHeader stageNum={stageNum} />

          <div key={`stage-body-${stageNum}`} className="coach-page-enter">
            <StageGuideBody>{children}</StageGuideBody>
          </div>
        </main>
      </ProjectWorkspaceLayout>
    </div>
    </StageGuideProvider>
  );
}

/** 컷 9 · WorkspaceTopBar + 좌측 단계 사이드바 + 작업 영역 */
export function ProjectStageShell({
  projectId,
  stageNum,
  projectTitle,
  projects,
  artifactMaxStage,
  currentPhase,
  children,
}: ProjectStageShellProps) {
  return (
    <ProjectWorkspaceProvider
      projectId={projectId}
      initialTitle={projectTitle}
      initialProjects={projects}
    >
      <ProjectStageShellInner
        projectId={projectId}
        stageNum={stageNum}
        artifactMaxStage={artifactMaxStage}
        currentPhase={currentPhase}
      >
        {children}
      </ProjectStageShellInner>
    </ProjectWorkspaceProvider>
  );
}
