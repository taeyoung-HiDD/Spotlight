import { ProjectHubShell } from "@/components/hub/ProjectHubShell";
import { fetchHubProjects } from "@/lib/projects/fetchHubProjects";

export default async function HomePage() {
  const hub = await fetchHubProjects();

  return (
    <div className="min-h-full bg-cream p-4 sm:p-5">
      <h1 className="sr-only">프로젝트 허브 · 컷 21</h1>
      <ProjectHubShell {...hub} />
    </div>
  );
}
