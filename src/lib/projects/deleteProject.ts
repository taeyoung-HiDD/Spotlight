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
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "프로젝트를 삭제할 수 없습니다." };
  }

  revalidatePath("/home");

  return { ok: true };
}
