import type {
  NeedGroup,
  Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { listLatentNeedPostits } from "@/lib/stages/stage5/latentNeedsGroups";

export type CategorizeNeedsGroupResult = {
  name: string;
  needIds: string[];
};

export type CategorizeNeedsResponse = {
  groups: CategorizeNeedsGroupResult[];
  source?: string;
};

function newGroupId(): string {
  return `ng-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function requestNeedsCategorization(
  projectId: string,
  needs: Array<{ id: string; text: string }>,
): Promise<CategorizeNeedsResponse> {
  const res = await fetch("/api/stage5/categorize-needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, needs }),
  });

  const json = (await res.json()) as CategorizeNeedsResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "니즈 재분류에 실패했습니다.");
  }

  return json;
}

/** AI/휴리스틱 결과를 보드 그룹 구조로 반영 (기존 그룹 교체) */
export function applyCategorizedNeedGroups(
  data: Stage5LatentNeedsData,
  groups: CategorizeNeedsGroupResult[],
): Stage5LatentNeedsData {
  const validIds = new Set(
    listLatentNeedPostits(data).map((p) => p.id),
  );

  const needGroups: NeedGroup[] = [];
  const needGroupMemberIds: Record<string, string[]> = {};
  const used = new Set<string>();

  for (const group of groups) {
    const needIds = group.needIds.filter((id) => {
      if (!validIds.has(id) || used.has(id)) return false;
      used.add(id);
      return true;
    });
    if (needIds.length === 0) continue;
    const id = newGroupId();
    needGroups.push({
      id,
      name: group.name.trim() || `그룹 ${needGroups.length + 1}`,
      order: needGroups.length,
    });
    needGroupMemberIds[id] = needIds;
  }

  const leftovers = [...validIds].filter((id) => !used.has(id));
  if (leftovers.length > 0) {
    const id = newGroupId();
    needGroups.push({
      id,
      name: "미분류",
      order: needGroups.length,
    });
    needGroupMemberIds[id] = leftovers;
  }

  return {
    ...data,
    workflowPhase: "needs_categorization",
    needGroups,
    needGroupMemberIds,
  };
}
