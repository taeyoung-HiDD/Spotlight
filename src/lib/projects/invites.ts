import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";

export interface ProjectInviteLink {
  token: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface InvitePreview {
  projectId: string;
  projectTitle: string;
  startingPoint: string;
  inviterName: string;
}

export function buildInviteUrl(token: string): string {
  if (typeof window === "undefined") {
    return `/invite/${token}`;
  }
  return `${window.location.origin}/invite/${token}`;
}

/** 소유자 · 활성 초대 링크 조회 또는 생성 */
export async function getOrCreateProjectInvite(
  projectId: string,
): Promise<ProjectInviteLink> {
  const supabase = createClient();
  const userId = await ensureAuthSession(supabase);

  const { data: existing } = await supabase
    .from("project_invites")
    .select("token, expires_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    return {
      token: existing.token,
      inviteUrl: buildInviteUrl(existing.token),
      expiresAt: existing.expires_at,
    };
  }

  const { data, error } = await supabase
    .from("project_invites")
    .insert({
      project_id: projectId,
      invited_by: userId,
      status: "pending",
    })
    .select("token, expires_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "초대 링크를 만들지 못했습니다.");
  }

  return {
    token: data.token,
    inviteUrl: buildInviteUrl(data.token),
    expiresAt: data.expires_at,
  };
}

export async function fetchInvitePreview(
  token: string,
): Promise<InvitePreview | null> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const { data, error } = await supabase.rpc("get_invite_preview", {
    invite_token: token,
  });

  if (error || !data?.length) return null;

  const row = data[0] as {
    project_id: string;
    project_title: string;
    starting_point: string;
    inviter_name: string;
  };

  return {
    projectId: row.project_id,
    projectTitle: row.project_title,
    startingPoint: row.starting_point,
    inviterName: row.inviter_name,
  };
}

export async function acceptProjectInvite(token: string): Promise<string> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const { data, error } = await supabase.rpc("accept_project_invite", {
    invite_token: token,
  });

  if (error) {
    throw new Error(
      error.message.includes("invite_invalid")
        ? "만료되었거나 유효하지 않은 초대입니다."
        : error.message,
    );
  }

  if (!data) throw new Error("프로젝트에 참여하지 못했습니다.");
  return data as string;
}
