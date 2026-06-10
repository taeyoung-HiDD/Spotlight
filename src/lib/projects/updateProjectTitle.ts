"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProjectUpdate } from "@/types/database";

export type UpdateProjectTitleResult =
  | { ok: true; title: string }
  | { ok: false; error: string };

export async function updateProjectTitleAction(
  projectId: string,
  title: string,
): Promise<UpdateProjectTitleResult> {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 80) {
    return { ok: false, error: "프로젝트 이름은 1~80자여야 합니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const patch: ProjectUpdate = { title: trimmed };
  const { error } = await supabase
    .from("projects")
    .update(patch as never)
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "프로젝트를 수정할 수 없습니다." };
  }

  revalidatePath(`/project/${projectId}`, "layout");

  return { ok: true, title: trimmed };
}
