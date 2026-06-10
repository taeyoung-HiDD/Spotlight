import { createClient } from "@/lib/supabase/server";

export type UserProjectListItem = {
  id: string;
  title: string;
  current_phase: string | null;
};

/** 프로젝트 전환 드롭다운용 목록 */
export async function fetchUserProjects(): Promise<UserProjectListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  type MemberProjectRow = {
    projects: {
      id: string;
      title: string;
      current_phase: string | null;
      status: string;
    };
  };

  const { data: memberRows, error: memberError } = await supabase
    .from("project_members")
    .select("projects!inner(id, title, current_phase, status, updated_at)")
    .eq("user_id", user.id);

  if (memberError || !memberRows?.length) return [];

  const seen = new Set<string>();
  const items: UserProjectListItem[] = [];

  for (const row of memberRows as MemberProjectRow[]) {
    const p = row.projects;
    if (p.status !== "active" || seen.has(p.id)) continue;
    seen.add(p.id);
    items.push({
      id: p.id,
      title: p.title,
      current_phase: p.current_phase,
    });
  }

  items.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  return items;
}
