import { createClient } from "@/lib/supabase/server";
import { STAGE_COUNT } from "@/lib/stages/constants";

/** 프로젝트에 artifact가 있는 단계 중 가장 높은 stage_id */
export async function fetchMaxStageReachedForProject(
  projectId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artifacts")
    .select("stage_id")
    .eq("project_id", projectId);

  if (error || !data?.length) return 0;

  type Row = { stage_id: number };
  let max = 0;
  for (const row of data as Row[]) {
    const stageId = Number(row.stage_id);
    if (stageId >= 1 && stageId <= STAGE_COUNT) {
      max = Math.max(max, stageId);
    }
  }
  return max;
}
