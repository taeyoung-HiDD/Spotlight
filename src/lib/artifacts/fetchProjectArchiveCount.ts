import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import type { ArtifactRow } from "@/types/database";

/** 클라이언트 — 자료실 산출물 개수(내용 있는 단계만) */
export async function fetchProjectArchiveCount(projectId: string): Promise<number> {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  const { data, error } = await supabase
    .from("artifacts")
    .select("stage_id, slots, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error || !data?.length) return 0;

  const seen = new Set<number>();
  let count = 0;
  for (const row of data as Pick<ArtifactRow, "stage_id" | "slots">[]) {
    const stageId = Number(row.stage_id);
    if (seen.has(stageId)) continue;
    seen.add(stageId);
    const slots = row.slots ?? {};
    const hasSlot = Object.values(slots).some(
      (s) => s && typeof s === "object" && s.state !== "empty",
    );
    if (hasSlot) count += 1;
  }
  return count;
}
