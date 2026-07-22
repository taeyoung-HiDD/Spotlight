import { fetchStage4Discoveries } from "@/lib/artifacts/stage4Discoveries";
import {
  fetchStage5LatentNeeds,
  saveStage5LatentNeeds,
} from "@/lib/artifacts/stage5LatentNeeds";
import {
  mergeStage4DiscoveriesIntoLatentNeeds,
} from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import {
  createStage5BoardPostit,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import type { RootReadingClaim } from "@/lib/stages/stage4/multidisciplinaryAnalysis";

/** Stage4 noteId → Stage5 source postit id */
export function stage5SourcePostitIdFromNoteId(noteId: string): string {
  return `s5-src-${noteId}`;
}

/**
 * MDA latentRoot(또는 기타 claim)을 Stage5 잠재 니즈 후보로 보냅니다.
 * 동일 claim id는 중복 생성하지 않습니다.
 */
export async function handoffRootClaimToStage5(input: {
  projectId: string;
  subjectId: string;
  claim: RootReadingClaim;
}): Promise<{ alreadySent: boolean; data: Stage5LatentNeedsData }> {
  const { projectId, subjectId, claim } = input;
  const text = claim.text.trim();
  if (!text) throw new Error("보낼 가설 문장이 비어 있어요.");

  const [stage4, stage5] = await Promise.all([
    fetchStage4Discoveries(projectId),
    fetchStage5LatentNeeds(projectId),
  ]);

  let board = mergeStage4DiscoveriesIntoLatentNeeds(stage5.data, stage4.data);

  const sourceRef = `mda-claim-${claim.id}`;
  const already = board.postits.some(
    (p) =>
      p.kind === "latent_need" &&
      (p.sourceRef === sourceRef || p.id === `s5-mda-${claim.id}`),
  );
  if (already) {
    return { alreadySent: true, data: board };
  }

  const linkedSourceIds = claim.sourceRefs
    .map(stage5SourcePostitIdFromNoteId)
    .filter((id) => board.postits.some((p) => p.id === id));

  const postit = createStage5BoardPostit(subjectId, "latent_need", {
    id: `s5-mda-${claim.id}`,
    text,
    readonly: false,
    kevinGenerated: true,
    sourceRef,
    linkedSourceIds: linkedSourceIds.length ? linkedSourceIds : undefined,
  });

  board = {
    ...board,
    postits: [...board.postits, postit],
    kevinGeneratedAt: new Date().toISOString(),
  };

  await saveStage5LatentNeeds({
    projectId,
    artifactId: stage5.artifactId,
    data: board,
    existingSlots: stage5.allSlots,
  });

  return { alreadySent: false, data: board };
}
