import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import {
  isStage4ResearchSynthesisMethod,
} from "@/lib/stages/fieldResearch/researchMethodCatalog";
import type {
  Stage3ResearchPrep,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import {
  guessMethodIdFromText,
  type ResearchSubject,
} from "@/lib/stages/stage4/researchSynthesisSubject";
import { quadrantHasContent } from "@/lib/stages/stage4/empathySticky";
import type { Stage4PersonaEmpathyMap } from "@/lib/stages/stage4/types";
import {
  createResearchSubject,
  createSynthesisNote,
  filterMeaningfulResearchSubjects,
  type ResearchSynthesisData,
  type SynthesisNoteKind,
} from "@/lib/stages/stage4/researchSynthesisTypes";

/** 데이터 정리 조사 대상 슬롯 상한 (패널과 동일) */
const MAX_RESEARCH_SUBJECTS = 12;

function pickDefaultResearchMethod(
  prep: Stage3ResearchPrep,
): ResearchSubject["researchMethodId"] {
  for (const id of prep.selectedMethods) {
    if (isStage4ResearchSynthesisMethod(id)) return id;
  }
  return "";
}

function buildSubjectSlotsFromPrep(
  prep: Stage3ResearchPrep,
  targetCount: number,
): Array<{ name: string; context: string }> {
  const slots: Array<{ name: string; context: string }> = [];
  for (const seg of prep.segments) {
    const n = Math.max(0, Math.floor(seg.selectedCount));
    for (let i = 0; i < n && slots.length < targetCount; i += 1) {
      const label = seg.label.trim();
      slots.push({
        name: n > 1 && label ? `${label} ${i + 1}` : label,
        context: "",
      });
    }
  }
  while (slots.length < targetCount) {
    slots.push({ name: "", context: "" });
  }
  return slots;
}

/**
 * 단계 3 「사용자 조사 준비하기」에서 정한 인원·세그먼트에 맞춰
 * 데이터 정리 조사 대상 슬롯을 맞춘다. 이미 내용이 있는 대상은 유지하고
 * 부족분만 채운다. 전부 빈 슬롯이면 준비 내용으로 재구성한다.
 */
export function ensureSubjectsFromStage3ResearchPrep(
  synthesis: ResearchSynthesisData,
  field: Pick<FieldResearchData, "researchPrep">,
): ResearchSynthesisData {
  const prep = field.researchPrep;
  const targetCount = Math.min(
    MAX_RESEARCH_SUBJECTS,
    Math.max(1, Math.round(Number(prep.selectedParticipantCount)) || 1),
  );

  const meaningful = filterMeaningfulResearchSubjects(synthesis);
  const defaultMethod = pickDefaultResearchMethod(prep);

  if (meaningful.length >= targetCount) {
    return synthesis;
  }

  if (meaningful.length > 0) {
    if (synthesis.subjects.length >= targetCount) return synthesis;
    const subjects = [...synthesis.subjects];
    while (subjects.length < targetCount) {
      subjects.push({
        ...createResearchSubject(subjects.length),
        researchMethodId: defaultMethod,
      });
    }
    return { ...synthesis, subjects };
  }

  const slots = buildSubjectSlotsFromPrep(prep, targetCount);
  const subjects = slots.map((slot, index) => ({
    ...createResearchSubject(index),
    name: slot.name,
    context: slot.context,
    researchMethodId: defaultMethod,
  }));
  const subjectIds = new Set(subjects.map((s) => s.id));

  return {
    ...synthesis,
    subjects,
    notes: synthesis.notes.filter(
      (n) => subjectIds.has(n.subjectId) && n.text.trim(),
    ),
  };
}

function logKindToNoteKind(
  kind: "behavior" | "quote" | "note",
): SynthesisNoteKind {
  if (kind === "quote") return "quote";
  if (kind === "behavior") return "observation";
  return "observation";
}

function upsertSubjectByKey(
  synthesis: ResearchSynthesisData,
  key: string,
  factory: () => ResearchSynthesisData["subjects"][number],
  matchName?: string,
): string {
  const existing = synthesis.subjects.find(
    (s) =>
      s.sourceRespondentId === key ||
      s.empathyMapId === key ||
      (matchName && s.name.trim() === matchName.trim()),
  );
  if (existing) return existing.id;
  const subject = factory();
  synthesis.subjects.push(subject);
  return subject.id;
}

function addNoteIfNew(
  synthesis: ResearchSynthesisData,
  subjectId: string,
  kind: SynthesisNoteKind,
  text: string,
  sourceRef: string,
  theme = "",
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const dup = synthesis.notes.some(
    (n) => n.sourceRef === sourceRef && n.text.trim() === trimmed,
  );
  if (dup) return;
  const note = createSynthesisNote(subjectId, kind);
  note.text = trimmed;
  note.sourceRef = sourceRef;
  note.theme = theme;
  synthesis.notes.push(note);
}

/** 단계 3 세션 로그 → 데이터 정리 보드 (언급·관찰만; 발견한 것은 조사자가 직접 입력) */
export function importFromStage3Sessions(
  synthesis: ResearchSynthesisData,
  field: FieldResearchData,
): ResearchSynthesisData {
  const next = {
    ...synthesis,
    subjects: [...synthesis.subjects],
    notes: [...synthesis.notes],
    themes: [...synthesis.themes],
  };

  for (const respondent of field.respondents) {
    const session = field.sessions[respondent.id];
    if (!session) continue;
    const hasContent =
      session.logEntries.some((e) => e.body.trim()) ||
      session.debriefing.keyQuote.trim();
    if (!hasContent) continue;

    const subjectId = upsertSubjectByKey(
      next,
      respondent.id,
      () => ({
        ...createResearchSubject(next.subjects.length),
        name: respondent.name,
        context: respondent.subtitle,
        researchMethodId:
          guessMethodIdFromText(session.method) || "shadowing",
        conductedAt: "",
        mediaFiles: [],
        sourceRespondentId: respondent.id,
      }),
      respondent.name,
    );

    for (const entry of session.logEntries) {
      addNoteIfNew(
        next,
        subjectId,
        logKindToNoteKind(entry.kind),
        entry.body,
        `s3-log-${entry.id}`,
      );
    }

    const keyQuote = session.debriefing.keyQuote.trim();
    if (keyQuote) {
      addNoteIfNew(
        next,
        subjectId,
        "quote",
        keyQuote,
        `s3-debrief-quote-${respondent.id}`,
      );
    }
  }

  next.stage3Imported = true;
  return next;
}

function mergeEmpathyMapIntoSubject(
  subjects: ResearchSubject[],
  subjectId: string,
  map: Stage4PersonaEmpathyMap,
) {
  const idx = subjects.findIndex((s) => s.id === subjectId);
  if (idx < 0) return;
  const current = subjects[idx];
  subjects[idx] = {
    ...current,
    empathyMapId: map.id,
    name: current.name.trim() || map.personaName,
    context: current.context.trim() || map.personaContext,
    thumbnailUrl: current.thumbnailUrl.trim() || map.personaThumbnailUrl,
  };
}

/** 공감맵 Says/Does → 데이터 정리 보드 */
export function importFromEmpathyMaps(
  synthesis: ResearchSynthesisData,
  empathyMaps: Stage4PersonaEmpathyMap[],
): ResearchSynthesisData {
  const next = {
    ...synthesis,
    subjects: [...synthesis.subjects],
    notes: [...synthesis.notes],
    themes: [...synthesis.themes],
  };

  empathyMaps.forEach((map, idx) => {
    const hasMap =
      map.personaName.trim() ||
      map.personaContext.trim() ||
      quadrantHasContent(map.quadrants.says) ||
      quadrantHasContent(map.quadrants.does);
    if (!hasMap) return;

    const displayName = map.personaName || `페르소나 ${idx + 1}`;
    const subjectId = upsertSubjectByKey(
      next,
      map.id,
      () => ({
        ...createResearchSubject(next.subjects.length),
        name: displayName,
        context: map.personaContext,
        researchMethodId: "",
        conductedAt: "",
        thumbnailUrl: map.personaThumbnailUrl,
        mediaFiles: [],
        empathyMapId: map.id,
      }),
      displayName,
    );

    mergeEmpathyMapIntoSubject(next.subjects, subjectId, map);

    for (const item of map.quadrants.says) {
      addNoteIfNew(
        next,
        subjectId,
        "quote",
        item.text,
        `s4-says-${map.id}-${item.id}`,
      );
    }
    for (const item of map.quadrants.does) {
      addNoteIfNew(
        next,
        subjectId,
        "observation",
        item.text,
        `s4-does-${map.id}-${item.id}`,
      );
    }
    for (const item of map.quadrants.thinks) {
      addNoteIfNew(
        next,
        subjectId,
        "finding",
        item.text,
        `s4-thinks-${map.id}-${item.id}`,
      );
    }
    for (const item of map.quadrants.feels) {
      addNoteIfNew(
        next,
        subjectId,
        "finding",
        item.text,
        `s4-feels-${map.id}-${item.id}`,
      );
    }
  });

  next.empathyImported = true;
  return next;
}
