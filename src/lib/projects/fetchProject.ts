import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types/database";

export async function fetchProject(
  projectId: string,
): Promise<Pick<Project, "id" | "title" | "description" | "status" | "current_phase"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, description, status, current_phase")
    .eq("id", projectId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Pick<
    Project,
    "id" | "title" | "description" | "status" | "current_phase"
  >;
}
