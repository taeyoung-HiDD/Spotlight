import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveArtifactDetail } from "@/components/archive/ArchiveArtifactDetail";
import { ProjectArchiveShell } from "@/components/archive/ProjectArchiveShell";
import { buildArchiveEntries } from "@/lib/artifacts/buildArchiveEntries";
import { fetchProjectArtifacts } from "@/lib/artifacts/fetchProjectArtifacts";
import { fetchMaxStageReachedForProject } from "@/lib/projects/fetchMaxStageReachedForProject";
import { fetchProject } from "@/lib/projects/fetchProject";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import { fetchUserProjects } from "@/lib/projects/fetchUserProjects";

interface ArchiveArtifactPageProps {
  params: Promise<{ projectId: string; stageId: string }>;
}

export default async function ArchiveArtifactPage({
  params,
}: ArchiveArtifactPageProps) {
  const { projectId, stageId: stageIdRaw } = await params;
  const stageId = Number.parseInt(stageIdRaw, 10);

  if (!Number.isFinite(stageId) || stageId < 1) {
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

  const [artifacts, artifactMaxStage, projects] = await Promise.all([
    fetchProjectArtifacts(projectId),
    fetchMaxStageReachedForProject(projectId),
    fetchUserProjects(),
  ]);

  const entries = buildArchiveEntries(artifacts);
  const entry = entries.find((item) => item.stageId === stageId);

  if (!entry) {
    notFound();
  }

  return (
    <ProjectArchiveShell
      projectId={projectId}
      projectTitle={project.title}
      projects={projects}
      artifactMaxStage={artifactMaxStage}
      currentPhase={project.current_phase}
      archiveEntryCount={entries.length}
    >
      <ArchiveArtifactDetail projectId={projectId} entry={entry} />
    </ProjectArchiveShell>
  );
}
