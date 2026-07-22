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
import { memberDisplayInitial } from "@/lib/users/memberInitial";
import type { Project, ProjectMember } from "@/types/database";

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
  /** 프로젝트 생성자(소유자) — 삭제·초대 권한 */
  isOwner: boolean;
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

function ensureOwnerMember(
  members: HubTeamMember[],
  ownerId: string,
  ownerName: string,
  ownerAvatar: string | null,
): HubTeamMember[] {
  if (members.some((m) => m.userId === ownerId)) return members;
  const owner: HubTeamMember = {
    userId: ownerId,
    displayName: ownerName,
    avatarUrl: ownerAvatar,
    initial: memberDisplayInitial(ownerName),
  };
  return [owner, ...members];
}

/** 컷 21 프로젝트 허브 — 멤버십 기준 프로젝트 목록 + 참여자 */
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
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null; avatar_url: string | null }>();

  const userName = resolveDisplayName(user, profile?.display_name);
  const userAvatar = profile?.avatar_url?.trim() || null;

  const { data: memberships, error: memberError } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);

  if (memberError) {
    return { ...fallback, userName, userInitial: displayInitial(userName) };
  }

  type MembershipRow = Pick<ProjectMember, "project_id">;

  const projectIds = [
    ...new Set(
      ((memberships ?? []) as MembershipRow[]).map((m) => m.project_id),
    ),
  ];

  if (!projectIds.length) {
    return { ...fallback, userName, userInitial: displayInitial(userName) };
  }

  const { data: rows, error } = await supabase
    .from("projects")
    .select("id, title, description, status, current_phase, updated_at, user_id")
    .in("id", projectIds)
    .order("updated_at", { ascending: false });

  if (error || !rows?.length) {
    return { ...fallback, userName, userInitial: displayInitial(userName) };
  }

  type HubRow = Pick<
    Project,
    | "id"
    | "title"
    | "description"
    | "status"
    | "current_phase"
    | "updated_at"
    | "user_id"
  >;

  const hubRows = rows as HubRow[];
  const ids = hubRows.map((row) => row.id);
  const [lastWorked, teamsByProject] = await Promise.all([
    fetchLastWorkedStageByProject(ids),
    fetchHubProjectTeams(ids),
  ]);

  const projects: HubProjectItem[] = hubRows.map((row) => {
    const rawMembers = teamsByProject.get(row.id) ?? [];
    const ownerName =
      row.user_id === user.id
        ? userName
        : rawMembers.find((m) => m.userId === row.user_id)?.displayName ??
          DISPLAY_NAME_FALLBACK;
    const ownerAvatar =
      row.user_id === user.id
        ? userAvatar
        : rawMembers.find((m) => m.userId === row.user_id)?.avatarUrl ?? null;

    const teamMembers = ensureOwnerMember(
      rawMembers,
      row.user_id,
      ownerName,
      ownerAvatar,
    );

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as HubProjectStatus,
      updatedAt: row.updated_at,
      resumeStage: resolveResumeStage({
        currentPhase: row.current_phase,
        lastWorkedStageId: lastWorked.get(row.id) ?? null,
      }),
      teamMembers,
      isOwner: row.user_id === user.id,
    };
  });

  return {
    userName,
    userInitial: displayInitial(userName),
    projects,
  };
}
