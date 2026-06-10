import { createClient } from "@/lib/supabase/server";
import {
  fetchHubProjectTeams,
  type HubTeamMember,
} from "@/lib/projects/fetchHubProjectTeams";
import { fetchLastWorkedStageByProject } from "@/lib/projects/fetchLastWorkedStageByProject";
import { resolveResumeStage } from "@/lib/projects/resolveResumeStage";
import {
  DISPLAY_NAME_FALLBACK,
  resolveDisplayName,
} from "@/lib/users/displayName";
import type { Project } from "@/types/database";

export type { HubTeamMember };

export type HubProjectStatus = "active" | "archived" | "completed";

export type HubProjectItem = {
  id: string;
  title: string;
  description: string | null;
  status: HubProjectStatus;
  updatedAt: string;
  resumeStage: number;
  teamMembers: HubTeamMember[];
};

export type HubProjectsPayload = {
  userName: string;
  userInitial: string;
  projects: HubProjectItem[];
};

function displayInitial(name: string): string {
  const t = name.trim();
  if (!t) return "민";
  return t.charAt(0);
}

/** 컷 21 프로젝트 허브 — 사용자 프로젝트 목록 */
export async function fetchHubProjects(): Promise<HubProjectsPayload> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const fallback: HubProjectsPayload = {
    userName: DISPLAY_NAME_FALLBACK,
    userInitial: displayInitial(DISPLAY_NAME_FALLBACK),
    projects: [],
  };

  if (!user) return fallback;

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null }>();

  const userName = resolveDisplayName(user, profile?.display_name);

  const { data: rows, error } = await supabase
    .from("projects")
    .select("id, title, description, status, current_phase, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error || !rows?.length) {
    return { ...fallback, userName, userInitial: displayInitial(userName) };
  }

  type HubRow = Pick<
    Project,
    "id" | "title" | "description" | "status" | "current_phase" | "updated_at"
  >;

  const hubRows = rows as HubRow[];
  const projectIds = hubRows.map((row) => row.id);
  const [lastWorked, teamsByProject] = await Promise.all([
    fetchLastWorkedStageByProject(projectIds),
    fetchHubProjectTeams(projectIds),
  ]);

  const projects: HubProjectItem[] = hubRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as HubProjectStatus,
    updatedAt: row.updated_at,
    resumeStage: resolveResumeStage({
      currentPhase: row.current_phase,
      lastWorkedStageId: lastWorked.get(row.id) ?? null,
    }),
    teamMembers: teamsByProject.get(row.id) ?? [],
  }));

  return {
    userName,
    userInitial: displayInitial(userName),
    projects,
  };
}
