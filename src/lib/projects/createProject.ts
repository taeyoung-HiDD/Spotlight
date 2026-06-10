import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  getEntryPointMeta,
  type EntryPointId,
} from "@/lib/projects/constants";
import type { ProjectInsert } from "@/types/database";

export interface CreateProjectResult {
  projectId: string;
  startStage: number;
}

/** 진입점 선택 후 projects 테이블에 행을 생성합니다. */
export async function createProjectFromEntryPoint(
  entryPoint: EntryPointId,
): Promise<CreateProjectResult> {
  const meta = getEntryPointMeta(entryPoint);
  const supabase = createClient();
  const userId = await ensureAuthSession(supabase);

  const payload: ProjectInsert = {
    user_id: userId,
    title: meta.defaultProjectTitle,
    description: meta.projectDescription,
    status: "active",
    current_phase: meta.currentPhase,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`프로젝트 생성에 실패했습니다: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("프로젝트 ID를 받지 못했습니다.");
  }

  return {
    projectId: data.id,
    startStage: meta.startStage,
  };
}
