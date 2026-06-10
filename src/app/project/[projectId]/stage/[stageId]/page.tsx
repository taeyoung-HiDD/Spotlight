import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProjectStageShell } from "@/components/project/ProjectStageShell";
import { Stage1Handoff } from "@/components/stage/stage1/Stage1Handoff";
import { Stage2EmpathyMap } from "@/components/stage/stage2/Stage2EmpathyMap";
import { Stage3FieldResearch } from "@/components/stage/stage3/Stage3FieldResearch";
import { Stage4Discoveries } from "@/components/stage/stage4/Stage4Discoveries";
import { StageDiscoveryShell } from "@/components/stage/StageDiscoveryShell";
import { Stage5Iceberg } from "@/components/stage/stage5/Stage5Iceberg";
import { Stage6UserJourney } from "@/components/stage/stage6/Stage6UserJourney";
import { Stage9ConceptSheet } from "@/components/stage/stage9/Stage9ConceptSheet";
import { Stage10Prototype } from "@/components/stage/stage10/Stage10Prototype";
import { fetchMaxStageReachedForProject } from "@/lib/projects/fetchMaxStageReachedForProject";
import { fetchProject } from "@/lib/projects/fetchProject";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import { fetchUserProjects } from "@/lib/projects/fetchUserProjects";

interface StagePageProps {
  params: Promise<{ projectId: string; stageId: string }>;
}

export default async function StagePage({ params }: StagePageProps) {
  const { projectId, stageId } = await params;
  const stageNum = Number.parseInt(stageId, 10);

  if (!Number.isFinite(stageNum) || stageNum < 1 || stageNum > 15) {
    notFound();
  }

  const access = await fetchProjectAccess(projectId);
  const project = await fetchProject(projectId);
  if (!access || !project) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-cream px-6">
        <p className="text-sm text-muted">
          프로젝트를 찾을 수 없거나 접근 권한이 없습니다.
        </p>
        <Link
          href="/home"
          className="rounded-md bg-spotlight px-4 py-2 text-sm font-medium text-on-spotlight"
        >
          홈으로
        </Link>
      </div>
    );
  }

  const artifactMaxStage = await fetchMaxStageReachedForProject(projectId);
  const projects = await fetchUserProjects();

  let stageContent: ReactNode;
  if (stageNum === 1) {
    stageContent = (
      <Stage1Handoff
        projectId={projectId}
        projectTitle={project.title}
        isInviteMember={!access.isOwner}
      />
    );
  } else if (stageNum === 2) {
    stageContent = <Stage2EmpathyMap projectId={projectId} />;
  } else if (stageNum === 3) {
    stageContent = <Stage3FieldResearch projectId={projectId} />;
  } else if (stageNum === 4) {
    stageContent = <Stage4Discoveries projectId={projectId} />;
  } else if (stageNum === 5) {
    stageContent = <Stage5Iceberg projectId={projectId} />;
  } else if (stageNum === 6) {
    stageContent = <Stage6UserJourney projectId={projectId} />;
  } else if (stageNum === 9) {
    stageContent = <Stage9ConceptSheet projectId={projectId} />;
  } else if (stageNum === 10) {
    stageContent = <Stage10Prototype projectId={projectId} />;
  } else {
    stageContent = (
      <StageDiscoveryShell projectId={projectId} stageNumber={stageNum} />
    );
  }

  return (
    <ProjectStageShell
      projectId={projectId}
      stageNum={stageNum}
      projectTitle={project.title}
      projects={projects}
      artifactMaxStage={artifactMaxStage}
      currentPhase={project.current_phase}
    >
      <div key={`stage-scene-${stageNum}`}>{stageContent}</div>
    </ProjectStageShell>
  );
}
