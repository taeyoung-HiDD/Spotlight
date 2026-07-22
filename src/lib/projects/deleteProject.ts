"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DeleteProjectResult =
  | { ok: true }
  | { ok: false; error: string };

/** 프로젝트 허브 · 소유자 프로젝트 삭제 (연관 artifact 등 cascade) */
export async function deleteProjectAction(
  projectId: string,
): Promise<DeleteProjectResult> {
  const trimmedId = projectId.trim();
  if (!trimmedId) {
    return { ok: false, error: "프로젝트를 찾을 수 없습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { data: deleted, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", trimmedId)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { ok: false, error: "프로젝트를 삭제할 수 없습니다." };
  }

  if (!deleted?.length) {
    return {
      ok: false,
      error: "삭제 권한이 없거나 이미 삭제된 프로젝트예요.",
    };
  }

  revalidatePath("/home");

  return { ok: true };
}
