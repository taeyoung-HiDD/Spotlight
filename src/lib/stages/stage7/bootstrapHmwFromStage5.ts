import type {
  NeedGroup,
  Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { sortedNeedGroups } from "@/lib/stages/stage5/latentNeedsGroups";
import {
  applyGeneratedHmw,
  applyHeuristicHmwDrafts,
  buildHmwGenerationInputs,
  requestHmwGeneration,
} from "@/lib/stages/stage7/generateHmwClient";
import {
  createHmwQuestionId,
  type HmwQuestion,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";

/** 6단계 분류 그룹을 HMW 보드용으로 스냅샷 (병합된 니즈만 유지) */
function snapshotNeedGroupsFromStage5(
  stage5: Stage5LatentNeedsData,
  needIds: Set<string>,
): {
  needGroups: NeedGroup[];
  needGroupMemberIds: Record<string, string[]>;
} {
  const needGroups: NeedGroup[] = [];
  const needGroupMemberIds: Record<string, string[]> = {};
  const used = new Set<string>();

  for (const group of sortedNeedGroups(stage5)) {
    const members = (stage5.needGroupMemberIds?.[group.id] ?? []).filter(
      (id) => needIds.has(id) && !used.has(id),
    );
    for (const id of members) used.add(id);
    needGroups.push({
      id: group.id,
      name: group.name.trim() || `그룹 ${needGroups.length + 1}`,
      order: needGroups.length,
    });
    needGroupMemberIds[group.id] = members;
  }

  return { needGroups, needGroupMemberIds };
}

export function stage5HasLatentNeeds(data: Stage5LatentNeedsData): boolean {
  return data.postits.some(
    (p) => p.kind === "latent_need" && p.text.trim().length > 0,
  );
}

export function hmwQuestionsChanged(
  before: Stage7HmwData,
  after: Stage7HmwData,
): boolean {
  if (before.questions.length !== after.questions.length) return true;
  const idsBefore = before.questions
    .map((q) => `${q.latentNeedId}:${q.latentNeedText}`)
    .sort()
    .join("|");
  const idsAfter = after.questions
    .map((q) => `${q.latentNeedId}:${q.latentNeedText}`)
    .sort()
    .join("|");
  return idsBefore !== idsAfter;
}

function needGroupsSnapshotKey(data: Stage7HmwData): string {
  const groups = [...(data.needGroups ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((g) => {
      const members = (data.needGroupMemberIds?.[g.id] ?? []).join(",");
      return `${g.id}:${g.name}:${members}`;
    });
  return groups.join("|");
}

/** HMW 본문·니즈 스냅샷 등 저장이 필요한 변경인지 */
export function hmwDataChanged(
  before: Stage7HmwData,
  after: Stage7HmwData,
): boolean {
  if (hmwQuestionsChanged(before, after)) return true;
  if (needGroupsSnapshotKey(before) !== needGroupsSnapshotKey(after)) {
    return true;
  }
  if (before.coreSelectionApplied !== after.coreSelectionApplied) return true;
  const beforeById = new Map(before.questions.map((q) => [q.id, q]));
  return after.questions.some((q) => {
    const prev = beforeById.get(q.id);
    if (!prev) return true;
    return (
      prev.hmwText.trim() !== q.hmwText.trim() ||
      prev.latentNeedText.trim() !== q.latentNeedText.trim()
    );
  });
}

export function mergeStage5IntoHmw(
  hmw: Stage7HmwData,
  stage5: Stage5LatentNeedsData,
): Stage7HmwData {
  // 핵심 니즈를 선별했다면 그것만, 아니면 전체 잠재 니즈 (하위호환)
  const coreIds = new Set(stage5.coreNeedIds ?? []);
  const latentNeeds = stage5.postits.filter(
    (p) =>
      p.kind === "latent_need" &&
      p.text.trim() &&
      (coreIds.size === 0 || coreIds.has(p.id)),
  );
  const existingByNeedId = new Map(
    hmw.questions.map((q) => [q.latentNeedId, q]),
  );

  const questions: HmwQuestion[] = latentNeeds.map((need) => {
    const existing = existingByNeedId.get(need.id);
    return {
      id: existing?.id ?? createHmwQuestionId(),
      latentNeedId: need.id,
      subjectId: need.subjectId,
      latentNeedText: need.text.trim(),
      hmwText: existing?.hmwText ?? "",
      kevinGenerated: existing?.kevinGenerated,
      variationKind: existing?.variationKind,
      qualityTips: existing?.qualityTips,
      candidates: existing?.candidates,
    };
  });

  const groupSnapshot = snapshotNeedGroupsFromStage5(
    stage5,
    new Set(questions.map((q) => q.latentNeedId)),
  );

  return {
    ...hmw,
    subjects: stage5.subjects,
    questions,
    needGroups: groupSnapshot.needGroups,
    needGroupMemberIds: groupSnapshot.needGroupMemberIds,
    coreSelectionApplied: coreIds.size > 0,
    stage5SyncedAt: new Date().toISOString(),
  };
}

/**
 * 7단계 진입 시 5단계 잠재 니즈를 병합하고, 비어 있는 HMW 질문을 자동 생성.
 * AI 생성 실패 시 휴리스틱 초안으로 폴백.
 */
export async function bootstrapHmwOnEntry(
  hmw: Stage7HmwData,
  stage5: Stage5LatentNeedsData,
  projectId: string,
): Promise<Stage7HmwData> {
  const merged = mergeStage5IntoHmw(hmw, stage5);
  const inputs = buildHmwGenerationInputs(merged);
  if (inputs.length === 0) return merged;

  try {
    const response = await requestHmwGeneration(projectId, inputs);
    return applyGeneratedHmw(merged, response.items);
  } catch {
    return applyHeuristicHmwDrafts(merged);
  }
}
