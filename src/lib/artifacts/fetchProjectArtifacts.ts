import { createClient } from "@/lib/supabase/server";
import type { ArtifactRow } from "@/types/database";

/** 프로젝트의 단계별 artifact — stage_id당 최신 1건 (서버 전용) */
export async function fetchProjectArtifacts(
  projectId: string,
): Promise<ArtifactRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`자료를 불러오지 못했습니다: ${error.message}`);
  }

  const rows = (data ?? []) as ArtifactRow[];
  const latestByStage = new Map<number, ArtifactRow>();
  for (const row of rows) {
    const stageId = Number(row.stage_id);
    if (!latestByStage.has(stageId)) {
      latestByStage.set(stageId, row);
    }
  }
  return [...latestByStage.values()].sort(
    (a, b) => Number(a.stage_id) - Number(b.stage_id),
  );
}
