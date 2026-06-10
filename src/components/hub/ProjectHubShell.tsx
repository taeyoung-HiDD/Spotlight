import { ProjectHubProjectList } from "@/components/hub/ProjectHubProjectList";
import { ProjectHubSidebar } from "@/components/hub/ProjectHubSidebar";
import { ProjectHubTopBar } from "@/components/hub/ProjectHubTopBar";
import type { HubProjectsPayload } from "@/lib/projects/fetchHubProjects";

/** 컷 21 · 프로젝트 허브 레이아웃 */
export function ProjectHubShell({
  userName,
  userInitial,
  projects,
}: HubProjectsPayload) {
  return (
    <div
      data-cut="21"
      data-mood="work"
      className="flex min-h-screen flex-col overflow-hidden rounded-2xl border border-border-warm bg-background shadow-[0_4px_16px_rgba(45,45,42,0.06)]"
    >
      <ProjectHubTopBar userName={userName} userInitial={userInitial} />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[244px_1fr]">
        <div className="hidden lg:block">
          <ProjectHubSidebar />
        </div>
        <ProjectHubProjectList userName={userName} projects={projects} />
      </div>
    </div>
  );
}
