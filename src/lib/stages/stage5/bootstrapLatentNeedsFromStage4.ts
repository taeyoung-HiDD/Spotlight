import { importFromEmpathyMaps } from "@/lib/stages/stage4/bootstrapFromStage3";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";
import {
  filterMeaningfulResearchSubjects,
  type ResearchSynthesisData,
  type SynthesisNote,
  type SynthesisNoteKind,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import type { Stage4DiscoveriesData } from "@/lib/stages/stage4/types";
import {
  createStage5BoardPostit,
  pruneStage5LatentNeedsData,
  type Stage5BoardPostit,
  type Stage5BoardPostitKind,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";

const STAGE5_SOURCE_NOTE_KINDS: SynthesisNoteKind[] = [
  "quote",
  "observation",
  "finding",
];

export function isStage5SourcePostitKind(
  kind: Stage5BoardPostitKind,
): kind is Exclude<Stage5BoardPostitKind, "latent_need"> {
  return kind === "quote" || kind === "observation" || kind === "finding";
}

/** 공감맵·데이터 정리 슬롯을 합쳐 5단계에 쓸 조사 스냅샷 구성 */
export function buildEffectiveResearchSynthesis(
  stage4: Stage4DiscoveriesData,
): ResearchSynthesisData {
  const base = {
    ...stage4.researchSynthesis,
    subjects: [...stage4.researchSynthesis.subjects],
    notes: [...stage4.researchSynthesis.notes],
    themes: [...stage4.researchSynthesis.themes],
  };
  return importFromEmpathyMaps(base, stage4.empathyMaps);
}

export function stage4HasResearchContent(stage4: Stage4DiscoveriesData): boolean {
  const synthesis = buildEffectiveResearchSynthesis(stage4);
  if (filterMeaningfulResearchSubjects(synthesis).length > 0) {
    return true;
  }
  return synthesis.notes.some(
    (n) => STAGE5_SOURCE_NOTE_KINDS.includes(n.kind) && n.text.trim(),
  );
}

function stableSourceRef(note: SynthesisNote): string {
  return note.sourceRef?.trim() || `s4-note-${note.id}`;
}

function synthesisNoteToPostit(note: SynthesisNote): Stage5BoardPostit | null {
  if (!STAGE5_SOURCE_NOTE_KINDS.includes(note.kind)) return null;
  const text = note.text.trim();
  if (!text) return null;

  return createStage5BoardPostit(note.subjectId, note.kind, {
    id: `s5-src-${note.id}`,
    text,
    readonly: true,
    sourceRef: stableSourceRef(note),
  });
}

/** 4단계 데이터 정리 → 5단계 통합 보드(언급·관찰·발견) */
export function bootstrapSourcePostitsFromStage4(
  synthesis: ResearchSynthesisData,
): Pick<Stage5LatentNeedsData, "subjects" | "postits"> {
  const meaningfulSubjects = filterMeaningfulResearchSubjects(synthesis);
  const allowedSubjectIds = new Set(meaningfulSubjects.map((s) => s.id));

  const subjects = meaningfulSubjects.map((s) => ({
    id: s.id,
    name: s.name,
    context: s.context,
    thumbnailUrl: s.thumbnailUrl,
    researchMethodId: (s.researchMethodId || "") as ResearchMethodId | "",
    conductedAt: s.conductedAt || "",
  }));

  const postits = synthesis.notes
    .filter((note) => allowedSubjectIds.has(note.subjectId))
    .map(synthesisNoteToPostit)
    .filter((p): p is Stage5BoardPostit => p !== null);

  return { subjects, postits };
}

export function mergeStage4DiscoveriesIntoLatentNeeds(
  current: Stage5LatentNeedsData,
  stage4: Stage4DiscoveriesData,
): Stage5LatentNeedsData {
  const synthesis = buildEffectiveResearchSynthesis(stage4);
  const { subjects, postits: incomingSources } =
    bootstrapSourcePostitsFromStage4(synthesis);

  const existingSourcesByRef = new Map(
    current.postits
      .filter((p) => isStage5SourcePostitKind(p.kind))
      .map((p) => [p.sourceRef ?? p.id, p]),
  );

  const mergedSources = incomingSources.map((incoming) => {
    const ref = incoming.sourceRef ?? incoming.id;
    const existing = existingSourcesByRef.get(ref);
    if (!existing) return incoming;
    return {
      ...incoming,
      id: existing.id,
    };
  });

  const subjectIds = new Set(subjects.map((s) => s.id));
  const latentNeeds = current.postits.filter(
    (p) => p.kind === "latent_need" && subjectIds.has(p.subjectId),
  );

  return pruneStage5LatentNeedsData({
    ...current,
    subjects,
    postits: [...mergedSources, ...latentNeeds],
    stage4SyncedAt: new Date().toISOString(),
  });
}

/** @deprecated synthesis만 전달 — `mergeStage4DiscoveriesIntoLatentNeeds` 사용 권장 */
export function mergeStage4IntoLatentNeeds(
  current: Stage5LatentNeedsData,
  synthesis: ResearchSynthesisData,
): Stage5LatentNeedsData {
  return mergeStage4DiscoveriesIntoLatentNeeds(current, {
    empathyMaps: [],
    personaTargetCount: 1,
    researchSynthesis: synthesis,
    synthesisNote: "",
    workflowPhase: "research_synthesis",
  });
}
