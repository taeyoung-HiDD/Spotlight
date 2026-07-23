import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";
import { getActivePersonaMap } from "@/lib/stages/stage6/userJourneyTypes";
import type {
  NeedGroup,
  Stage5BoardPostit,
  Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";

function newGroupId(): string {
  return `ng-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function listLatentNeedPostits(
  data: Stage5LatentNeedsData,
  subjectId?: string,
): Stage5BoardPostit[] {
  return data.postits.filter(
    (p) =>
      p.kind === "latent_need" &&
      p.text.trim() &&
      (!subjectId || p.subjectId === subjectId),
  );
}

export function placedNeedIdsInGroups(
  data: Stage5LatentNeedsData,
): Set<string> {
  const placed = new Set<string>();
  for (const ids of Object.values(data.needGroupMemberIds ?? {})) {
    for (const id of ids) placed.add(id);
  }
  return placed;
}

export function groupLatentNeeds(
  data: Stage5LatentNeedsData,
  groupId: string,
): Stage5BoardPostit[] {
  const ids = data.needGroupMemberIds?.[groupId] ?? [];
  const byId = new Map(data.postits.map((p) => [p.id, p] as const));
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is Stage5BoardPostit => {
      if (!p) return false;
      return p.kind === "latent_need" && Boolean(p.text.trim());
    });
}

export function sortedNeedGroups(data: Stage5LatentNeedsData): NeedGroup[] {
  return [...(data.needGroups ?? [])].sort((a, b) => a.order - b.order);
}

export function addNeedGroup(
  data: Stage5LatentNeedsData,
  name = "새 그룹",
): Stage5LatentNeedsData {
  const groups = sortedNeedGroups(data);
  const group: NeedGroup = {
    id: newGroupId(),
    name,
    order: groups.length,
  };
  return {
    ...data,
    needGroups: [...groups, group],
    needGroupMemberIds: {
      ...(data.needGroupMemberIds ?? {}),
      [group.id]: [],
    },
  };
}

export function renameNeedGroup(
  data: Stage5LatentNeedsData,
  groupId: string,
  name: string,
): Stage5LatentNeedsData {
  return {
    ...data,
    needGroups: (data.needGroups ?? []).map((g) =>
      g.id === groupId ? { ...g, name } : g,
    ),
  };
}

export function removeNeedGroup(
  data: Stage5LatentNeedsData,
  groupId: string,
): Stage5LatentNeedsData {
  const members = data.needGroupMemberIds?.[groupId] ?? [];
  const remainingGroups = (data.needGroups ?? []).filter(
    (g) => g.id !== groupId,
  );
  const memberMap = { ...(data.needGroupMemberIds ?? {}) };
  delete memberMap[groupId];

  // 삭제된 그룹의 니즈 → 첫 그룹 또는 새「미분류」
  if (members.length > 0) {
    let targetId = remainingGroups.sort((a, b) => a.order - b.order)[0]?.id;
    let groups = remainingGroups;
    if (!targetId) {
      const uncategorized: NeedGroup = {
        id: newGroupId(),
        name: "미분류",
        order: 0,
      };
      groups = [uncategorized];
      targetId = uncategorized.id;
      memberMap[targetId] = [];
    }
    const existing = memberMap[targetId] ?? [];
    const merged = [...existing];
    for (const id of members) {
      if (!merged.includes(id)) merged.push(id);
    }
    memberMap[targetId] = merged;
    return {
      ...data,
      needGroups: groups.map((g, i) => ({ ...g, order: i })),
      needGroupMemberIds: memberMap,
    };
  }

  return {
    ...data,
    needGroups: remainingGroups.map((g, i) => ({ ...g, order: i })),
    needGroupMemberIds: memberMap,
  };
}

export function assignNeedToGroup(
  data: Stage5LatentNeedsData,
  needId: string,
  groupId: string,
): Stage5LatentNeedsData {
  const need = data.postits.find((p) => p.id === needId);
  if (!need || need.kind !== "latent_need") return data;
  if (!(data.needGroups ?? []).some((g) => g.id === groupId)) return data;

  const memberMap: Record<string, string[]> = {};
  for (const [gid, ids] of Object.entries(data.needGroupMemberIds ?? {})) {
    const filtered = ids.filter((id) => id !== needId);
    if (filtered.length > 0 || gid === groupId) memberMap[gid] = filtered;
  }
  const current = memberMap[groupId] ?? [];
  memberMap[groupId] = current.includes(needId)
    ? current
    : [...current, needId];

  return { ...data, needGroupMemberIds: memberMap };
}

/**
 * 분류 단계 진입 시: 그룹이 없으면 여정 단계·미분류로 초안 구성.
 * 이미 그룹이 있으면 미배치 잠재 니즈만「미분류」에 보충.
 */
export function ensureNeedGroupsBootstrapped(
  data: Stage5LatentNeedsData,
  journey: UserJourneyMapData,
): Stage5LatentNeedsData {
  const latents = listLatentNeedPostits(data);
  if (latents.length === 0) {
    return {
      ...data,
      needGroups: data.needGroups ?? [],
      needGroupMemberIds: data.needGroupMemberIds ?? {},
    };
  }

  const existingGroups = sortedNeedGroups(data);
  if (existingGroups.length > 0) {
    const placed = placedNeedIdsInGroups(data);
    const orphanIds = latents
      .map((p) => p.id)
      .filter((id) => !placed.has(id));
    if (orphanIds.length === 0) return data;

    let next = data;
    let uncategorized = existingGroups.find((g) => g.name === "미분류");
    if (!uncategorized) {
      next = addNeedGroup(next, "미분류");
      uncategorized = sortedNeedGroups(next).find((g) => g.name === "미분류")!;
    }
    let memberMap = { ...(next.needGroupMemberIds ?? {}) };
    const bucket = [...(memberMap[uncategorized.id] ?? [])];
    for (const id of orphanIds) {
      if (!bucket.includes(id)) bucket.push(id);
    }
    memberMap[uncategorized.id] = bucket;
    return { ...next, needGroupMemberIds: memberMap };
  }

  // 초안: 여정 단계별 그룹 + 미분류
  const persona = getActivePersonaMap(journey);
  const steps = persona
    ? [...persona.steps].sort((a, b) => a.order - b.order)
    : [];
  const stepNeedMap = data.journeyStepNeedIds ?? {};
  const used = new Set<string>();
  const groups: NeedGroup[] = [];
  const memberMap: Record<string, string[]> = {};

  for (const step of steps) {
    const ids = (stepNeedMap[step.id] ?? []).filter((id) => {
      const p = data.postits.find((x) => x.id === id);
      return Boolean(p && p.kind === "latent_need" && p.text.trim());
    });
    if (ids.length === 0) continue;
    const group: NeedGroup = {
      id: newGroupId(),
      name: step.label.trim() || `단계 ${step.order + 1}`,
      order: groups.length,
    };
    groups.push(group);
    memberMap[group.id] = ids;
    for (const id of ids) used.add(id);
  }

  const leftovers = latents.map((p) => p.id).filter((id) => !used.has(id));
  if (leftovers.length > 0 || groups.length === 0) {
    const uncategorized: NeedGroup = {
      id: newGroupId(),
      name: "미분류",
      order: groups.length,
    };
    groups.push(uncategorized);
    memberMap[uncategorized.id] =
      leftovers.length > 0 ? leftovers : latents.map((p) => p.id);
  }

  return {
    ...data,
    needGroups: groups,
    needGroupMemberIds: memberMap,
  };
}

export function setNeedsWorkflowPhase(
  data: Stage5LatentNeedsData,
  phase: Stage5LatentNeedsData["workflowPhase"],
  journey?: UserJourneyMapData,
): Stage5LatentNeedsData {
  let next: Stage5LatentNeedsData = { ...data, workflowPhase: phase };
  if (phase === "needs_categorization" && journey) {
    next = ensureNeedGroupsBootstrapped(next, journey);
  }
  return next;
}
