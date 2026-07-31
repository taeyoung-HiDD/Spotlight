import { importFromEmpathyMaps } from "@/lib/stages/stage4/bootstrapFromStage3";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";
import {
  filterMeaningfulResearchSubjects,
  type ResearchSynthesisData,
  type ResearchSubject,
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
  type Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";
import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";

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

function subjectToStage5Ref(s: ResearchSubject): Stage5SubjectRef {
  return {
    id: s.id,
    name: s.name,
    context: s.context,
    thumbnailUrl: s.thumbnailUrl,
    researchMethodId: (s.researchMethodId || "") as ResearchMethodId | "",
    conductedAt: s.conductedAt || "",
  };
}

/** 4단계 데이터 정리 → 5단계 통합 보드(언급·관찰·발견) */
export function bootstrapSourcePostitsFromStage4(
  synthesis: ResearchSynthesisData,
): Pick<Stage5LatentNeedsData, "subjects" | "postits"> {
  const subjectsById = new Map(
    filterMeaningfulResearchSubjects(synthesis).map((s) => [
      s.id,
      subjectToStage5Ref(s),
    ]),
  );

  // 의미 있는 대상에 없더라도 조사 노트가 있으면 대상·소스를 포함
  for (const note of synthesis.notes) {
    if (!STAGE5_SOURCE_NOTE_KINDS.includes(note.kind) || !note.text.trim()) {
      continue;
    }
    if (subjectsById.has(note.subjectId)) continue;
    const fromList = synthesis.subjects.find((s) => s.id === note.subjectId);
    if (fromList) {
      subjectsById.set(fromList.id, subjectToStage5Ref(fromList));
    } else {
      subjectsById.set(note.subjectId, {
        id: note.subjectId,
        name: "",
        context: "",
        thumbnailUrl: "",
        researchMethodId: "",
        conductedAt: "",
      });
    }
  }

  const subjects = [...subjectsById.values()];
  const allowedSubjectIds = new Set(subjects.map((s) => s.id));

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

/**
 * 여정 지도에 올라간 언급·관찰을 Stage5 조사 소스로 보강.
 * Stage4 동기화가 비었거나 대상 id가 어긋나도 생성이 돌 수 있게 합니다.
 */
export function mergeJourneyItemsIntoLatentNeeds(
  current: Stage5LatentNeedsData,
  journey: UserJourneyMapData,
): Stage5LatentNeedsData {
  const subjectsById = new Map(
    current.subjects.map((s) => [s.id, s] as const),
  );
  for (const s of journey.subjects) {
    if (subjectsById.has(s.id)) continue;
    subjectsById.set(s.id, {
      id: s.id,
      name: s.name,
      context: s.context,
      thumbnailUrl: s.thumbnailUrl ?? "",
      researchMethodId: "",
      conductedAt: "",
    });
  }

  const existingSources = current.postits.filter((p) =>
    isStage5SourcePostitKind(p.kind),
  );
  const byRef = new Map(
    existingSources.map((p) => [p.sourceRef ?? p.id, p] as const),
  );
  const byTextKey = new Map(
    existingSources.map(
      (p) => [`${p.subjectId}::${p.text.trim()}`, p] as const,
    ),
  );

  const incoming: Stage5BoardPostit[] = [];
  for (const item of Object.values(journey.itemsById ?? {})) {
    if (item.kind !== "quote" && item.kind !== "observation") continue;
    const text = item.text.trim();
    if (!text) continue;

    const noteId =
      item.sourceId?.trim() ||
      (item.id.startsWith("s4-") ? item.id.slice(3) : item.id);
    const sourceRef = item.sourceId?.trim()
      ? `s4-note-${item.sourceId.trim()}`
      : `journey-${item.id}`;

    if (
      byRef.has(sourceRef) ||
      byRef.has(`s4-note-${noteId}`) ||
      byRef.has(item.id) ||
      byTextKey.has(`${item.subjectId}::${text}`)
    ) {
      continue;
    }

    if (!subjectsById.has(item.subjectId)) {
      subjectsById.set(item.subjectId, {
        id: item.subjectId,
        name: "",
        context: "",
        thumbnailUrl: "",
        researchMethodId: "",
        conductedAt: "",
      });
    }

    const postit = createStage5BoardPostit(item.subjectId, item.kind, {
      id: `s5-src-${noteId}`,
      text,
      readonly: true,
      sourceRef,
    });
    incoming.push(postit);
    byRef.set(sourceRef, postit);
    byTextKey.set(`${item.subjectId}::${text}`, postit);
  }

  if (incoming.length === 0 && subjectsById.size === current.subjects.length) {
    return current;
  }

  const subjectIds = new Set(subjectsById.keys());
  const latentNeeds = current.postits.filter(
    (p) => p.kind === "latent_need" && subjectIds.has(p.subjectId),
  );

  return pruneStage5LatentNeedsData({
    ...current,
    subjects: [...subjectsById.values()],
    postits: [...existingSources, ...incoming, ...latentNeeds],
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
