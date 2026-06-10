import { createClient } from "@/lib/supabase/server";
import { STAGE_COUNT } from "@/lib/stages/constants";

/** 프로젝트별 마지막 작업 단계(stage_id) — artifacts.updated_at 최신 기준 */
export async function fetchLastWorkedStageByProject(
  projectIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (projectIds.length === 0) return map;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("project_id, stage_id, updated_at")
    .in("project_id", projectIds)
    .order("updated_at", { ascending: false });

  if (error || !data?.length) return map;

  type ArtifactRow = {
    project_id: string;
    stage_id: number;
    updated_at: string;
  };

  for (const row of data as ArtifactRow[]) {
    const pid = row.project_id;
    if (map.has(pid)) continue;
    const stageId = Number(row.stage_id);
    if (stageId >= 1 && stageId <= STAGE_COUNT) {
      map.set(pid, stageId);
    }
  }

  return map;
}

/** 단일 프로젝트 이어하기 단계 */
export async function fetchLastWorkedStageForProject(
  projectId: string,
): Promise<number | null> {
  const map = await fetchLastWorkedStageByProject([projectId]);
  return map.get(projectId) ?? null;
}
