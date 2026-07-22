import { ProjectHubShell } from "@/components/hub/ProjectHubShell";
import { fetchHubProjects } from "@/lib/projects/fetchHubProjects";
import {
  WORKSPACE_HOME_PAGE_NAME,
  WORKSPACE_HOME_PAGE_NAME_EN,
} from "@/lib/navigation/stageNavLabels";

export default async function HomePage() {
  const hub = await fetchHubProjects();

  return (
    <div className="min-h-full bg-cream p-4 sm:p-5">
      <h1 className="sr-only">
        {WORKSPACE_HOME_PAGE_NAME} · {WORKSPACE_HOME_PAGE_NAME_EN}
      </h1>
      <ProjectHubShell {...hub} />
    </div>
  );
}
