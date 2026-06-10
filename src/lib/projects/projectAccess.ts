import { createClient } from "@/lib/supabase/server";

export type ProjectAccessRole = "owner" | "member";

export interface ProjectAccess {
  projectId: string;
  role: ProjectAccessRole;
  isOwner: boolean;
}

export async function fetchProjectAccess(
  projectId: string,
): Promise<ProjectAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return null;

  const row = project as { id: string; user_id: string };

  if (row.user_id === user.id) {
    return { projectId, role: "owner", isOwner: true };
  }

  const { data: member } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return null;

  const memberRow = member as { role: "owner" | "member" };

  return {
    projectId,
    role: memberRow.role === "owner" ? "owner" : "member",
    isOwner: false,
  };
}
