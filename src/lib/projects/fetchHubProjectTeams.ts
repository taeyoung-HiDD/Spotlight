import { createClient } from "@/lib/supabase/server";
import {
  DISPLAY_NAME_FALLBACK,
  resolveDisplayName,
} from "@/lib/users/displayName";
import { memberDisplayInitial } from "@/lib/users/memberInitial";

export type HubTeamMember = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  initial: string;
};

type MemberRow = {
  project_id: string;
  user_id: string;
  joined_at: string;
  users: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function fetchHubProjectTeams(
  projectIds: string[],
): Promise<Map<string, HubTeamMember[]>> {
  const result = new Map<string, HubTeamMember[]>();
  if (projectIds.length === 0) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "project_id, user_id, joined_at, users ( display_name, avatar_url )",
    )
    .in("project_id", projectIds)
    .order("joined_at", { ascending: true });

  if (error || !data?.length) return result;

  for (const row of data as MemberRow[]) {
    const displayName =
      row.users?.display_name?.trim() || DISPLAY_NAME_FALLBACK;
    const member: HubTeamMember = {
      userId: row.user_id,
      displayName: resolveDisplayName(null, displayName),
      avatarUrl: row.users?.avatar_url?.trim() || null,
      initial: memberDisplayInitial(displayName),
    };
    const list = result.get(row.project_id) ?? [];
    if (!list.some((m) => m.userId === member.userId)) {
      list.push(member);
      result.set(row.project_id, list);
    }
  }

  return result;
}
