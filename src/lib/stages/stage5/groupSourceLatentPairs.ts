import { postitSortKey } from "@/lib/stages/stage4/postitLayout";
import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import type {
  Stage5BoardPostit,
  Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";

export interface SourceLatentPair {
  id: string;
  source: Stage5BoardPostit;
  latents: Stage5BoardPostit[];
  subjectId: string;
}

const KIND_ORDER = {
  quote: 0,
  observation: 1,
  finding: 2,
  latent_need: 3,
};

function sortSources(postits: Stage5BoardPostit[]): Stage5BoardPostit[] {
  return [...postits].sort((a, b) => {
    const ko = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (ko !== 0) return ko;
    return postitSortKey(a.id) - postitSortKey(b.id);
  });
}

function sortLatents(postits: Stage5BoardPostit[]): Stage5BoardPostit[] {
  return [...postits].sort(
    (a, b) => postitSortKey(a.id) - postitSortKey(b.id),
  );
}

/** 잠재 니즈 → 연결된 조사 포스트잇 id (중복 배정 방지) */
function assignLatentsToSources(
  sources: Stage5BoardPostit[],
  latents: Stage5BoardPostit[],
): Map<string, Stage5BoardPostit[]> {
  const bySource = new Map<string, Stage5BoardPostit[]>(
    sources.map((s) => [s.id, []]),
  );
  const assigned = new Set<string>();

  for (const latent of sortLatents(latents)) {
    const ids = latent.linkedSourceIds?.filter(Boolean) ?? [];
    let targetId: string | null = null;

    if (ids.length === 1 && bySource.has(ids[0]!)) {
      targetId = ids[0]!;
    } else if (ids.length > 1) {
      const candidates = ids
        .filter((id) => bySource.has(id))
        .sort(
          (a, b) =>
            (bySource.get(a)?.length ?? 0) - (bySource.get(b)?.length ?? 0),
        );
      targetId = candidates[0] ?? null;
    }

    if (!targetId || assigned.has(latent.id)) continue;
    bySource.get(targetId)!.push(latent);
    assigned.add(latent.id);
  }

  // linkedSourceIds 없는 잠재 니즈 — 같은 조사 대상의 소스에 순서대로 배정
  const unassigned = sortLatents(latents).filter((l) => !assigned.has(l.id));
  for (const latent of unassigned) {
    const subjectSources = sources.filter(
      (s) => s.subjectId === latent.subjectId,
    );
    const idx = unassigned.indexOf(latent);
    const target =
      subjectSources[idx % Math.max(subjectSources.length, 1)] ??
      subjectSources[0];
    if (!target) continue;
    bySource.get(target.id)!.push(latent);
    assigned.add(latent.id);
  }

  return bySource;
}

/** 조사 포스트잇 1장 + 연결된 잠재 니즈 */
export function buildSourceLatentPairs(
  data: Stage5LatentNeedsData,
): SourceLatentPair[] {
  const sources = sortSources(
    data.postits.filter((p) => isStage5SourcePostitKind(p.kind)),
  );
  const latents = data.postits.filter((p) => p.kind === "latent_need");
  const bySource = assignLatentsToSources(sources, latents);

  const subjectOrder = new Map(
    data.subjects.map((s, i) => [s.id, i]),
  );

  return sources
    .map((source) => ({
      id: `pair-${source.id}`,
      source,
      latents: sortLatents(bySource.get(source.id) ?? []),
      subjectId: source.subjectId,
    }))
    .sort((a, b) => {
      const ao = subjectOrder.get(a.subjectId) ?? 999;
      const bo = subjectOrder.get(b.subjectId) ?? 999;
      if (ao !== bo) return ao - bo;
      const ko = KIND_ORDER[a.source.kind] - KIND_ORDER[b.source.kind];
      if (ko !== 0) return ko;
      return postitSortKey(a.source.id) - postitSortKey(b.source.id);
    });
}

export function sourceIdsForSubject(
  data: Stage5LatentNeedsData,
  subjectId: string,
): string[] {
  return data.postits
    .filter(
      (p) =>
        p.subjectId === subjectId && isStage5SourcePostitKind(p.kind),
    )
    .map((p) => p.id);
}
