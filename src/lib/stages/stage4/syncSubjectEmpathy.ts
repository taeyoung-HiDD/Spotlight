import type {
  EmpathyQuadrantId,
  EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";
import { createEmpathyStickyItem } from "@/lib/stages/stage4/empathySticky";
import {
  createResearchSubject,
  createSynthesisNote,
  type ResearchSynthesisData,
  type SynthesisNoteKind,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import {
  createStage4PersonaMap,
  type Stage4DiscoveriesData,
  type Stage4PersonaEmpathyMap,
} from "@/lib/stages/stage4/types";

const MAX_SUBJECTS = 12;

const QUADRANT_TO_NOTE: Record<EmpathyQuadrantId, SynthesisNoteKind> = {
  says: "quote",
  does: "observation",
  thinks: "finding",
  feels: "finding",
};

function noteSourceRef(
  mapId: string,
  quadrant: EmpathyQuadrantId,
  stickyId: string,
): string {
  return `s4-${quadrant}-${mapId}-${stickyId}`;
}

function mediaStickyId(
  mediaId: string,
  quadrant: EmpathyQuadrantId,
  index: number,
): string {
  return `media-${mediaId}-${quadrant}-${index}`;
}

/** 조사 대상 ↔ 공감맵 1:1 링크 보장 + notes를 맵에서 재동기화 */
export function ensureSubjectEmpathyLinks(
  data: Stage4DiscoveriesData,
): Stage4DiscoveriesData {
  let subjects = [...data.researchSynthesis.subjects];
  let empathyMaps = [...data.empathyMaps];

  if (subjects.length === 0) {
    const map = empathyMaps[0] ?? createStage4PersonaMap(0);
    empathyMaps = empathyMaps.length ? empathyMaps : [map];
    subjects = [
      {
        ...createResearchSubject(0),
        name: map.personaName,
        context: map.personaContext,
        thumbnailUrl: map.personaThumbnailUrl,
        empathyMapId: map.id,
      },
    ];
  }

  // 대상마다 맵 확보
  subjects = subjects.slice(0, MAX_SUBJECTS).map((subject, idx) => {
    const linked = subject.empathyMapId
      ? empathyMaps.find((m) => m.id === subject.empathyMapId)
      : undefined;
    if (linked) {
      return {
        ...subject,
        empathyMapId: linked.id,
      };
    }
    // 이름 매칭 시도
    const name = subject.name.trim().toLowerCase();
    const byName =
      name &&
      empathyMaps.find(
        (m) =>
          m.personaName.trim().toLowerCase() === name &&
          !subjects.some(
            (s) => s.id !== subject.id && s.empathyMapId === m.id,
          ),
      );
    if (byName) {
      return { ...subject, empathyMapId: byName.id };
    }
    const created = createStage4PersonaMap(idx);
    created.personaName = subject.name;
    created.personaContext = subject.context;
    created.personaThumbnailUrl = subject.thumbnailUrl;
    empathyMaps.push(created);
    return { ...subject, empathyMapId: created.id };
  });

  // 대상 → 맵 신원 필드 반영 (대상이 소스)
  empathyMaps = empathyMaps.map((map) => {
    const subject = subjects.find((s) => s.empathyMapId === map.id);
    if (!subject) return map;
    return {
      ...map,
      personaName: subject.name.trim() || map.personaName,
      personaContext: subject.context.trim() || map.personaContext,
      personaThumbnailUrl:
        subject.thumbnailUrl.trim() || map.personaThumbnailUrl,
    };
  });

  // 링크되지 않은 고아 맵 제거 (대상이 주도)
  const linkedIds = new Set(
    subjects.map((s) => s.empathyMapId).filter(Boolean) as string[],
  );
  empathyMaps = empathyMaps.filter((m) => linkedIds.has(m.id));
  if (empathyMaps.length === 0) {
    const map = createStage4PersonaMap(0);
    subjects[0] = { ...subjects[0]!, empathyMapId: map.id };
    empathyMaps = [map];
  }

  const synthesis = syncEmpathyMapsToNotes(
    { ...data.researchSynthesis, subjects },
    empathyMaps,
  );

  return {
    ...data,
    empathyMaps,
    personaTargetCount: empathyMaps.length,
    researchSynthesis: synthesis,
    workflowPhase: "research_synthesis",
  };
}

/** 공감맵 4분면 → synthesis.notes 전체 upsert (맵 기반 노트만 교체) */
export function syncEmpathyMapsToNotes(
  synthesis: ResearchSynthesisData,
  empathyMaps: Stage4PersonaEmpathyMap[],
): ResearchSynthesisData {
  const mapById = new Map(empathyMaps.map((m) => [m.id, m]));
  const keepNotes = synthesis.notes.filter((n) => {
    // 맵에서 온 노트(s4-says-...)는 재생성; 그 외(수동·레거시 media:)는 유지하되
    // 미디어 배치는 이제 맵 sticky로만 가므로 media: 노트는 드롭
    if (n.sourceRef?.startsWith("s4-")) return false;
    if (n.sourceRef?.startsWith("media:")) return false;
    return true;
  });

  const generated = [];
  for (const subject of synthesis.subjects) {
    const mapId = subject.empathyMapId;
    if (!mapId) continue;
    const map = mapById.get(mapId);
    if (!map) continue;

    for (const quadrant of ["says", "thinks", "does", "feels"] as const) {
      const kind = QUADRANT_TO_NOTE[quadrant];
      for (const item of map.quadrants[quadrant]) {
        const text = item.text.trim();
        if (!text) continue;
        generated.push({
          ...createSynthesisNote(subject.id, kind),
          id: `sn-${noteSourceRef(mapId, quadrant, item.id)}`,
          text,
          sourceRef: noteSourceRef(mapId, quadrant, item.id),
        });
      }
    }
  }

  return {
    ...synthesis,
    notes: [...keepNotes, ...generated],
    empathyImported: true,
  };
}

export function getLinkedEmpathyMap(
  data: Stage4DiscoveriesData,
  subjectId: string,
): Stage4PersonaEmpathyMap | null {
  const subject = data.researchSynthesis.subjects.find((s) => s.id === subjectId);
  if (!subject?.empathyMapId) return null;
  return data.empathyMaps.find((m) => m.id === subject.empathyMapId) ?? null;
}

/** 미디어 분석 결과를 공감맵 분면에 append (중복 id 스킵) */
export function appendQuadrantsToEmpathyMap(
  map: Stage4PersonaEmpathyMap,
  mediaId: string,
  quadrants: Partial<Record<EmpathyQuadrantId, string[]>>,
): Stage4PersonaEmpathyMap {
  const next = {
    ...map,
    quadrants: {
      says: [...map.quadrants.says],
      thinks: [...map.quadrants.thinks],
      does: [...map.quadrants.does],
      feels: [...map.quadrants.feels],
    },
  };

  for (const quadrant of ["says", "thinks", "does", "feels"] as const) {
    const texts = (quadrants[quadrant] ?? [])
      .map((t) => t.trim())
      .filter(Boolean);
    const existingTexts = new Set(
      next.quadrants[quadrant].map((i) => i.text.trim()),
    );
    texts.forEach((text, index) => {
      if (existingTexts.has(text)) return;
      const id = mediaStickyId(mediaId, quadrant, index);
      if (next.quadrants[quadrant].some((i) => i.id === id)) return;
      const item: EmpathyStickyItem = {
        ...createEmpathyStickyItem(),
        id,
        text,
        fromSuggestion: true,
      };
      next.quadrants[quadrant].push(item);
      existingTexts.add(text);
    });
  }

  return next;
}

export function updateLinkedMapQuadrant(
  data: Stage4DiscoveriesData,
  mapId: string,
  quadrantId: EmpathyQuadrantId,
  items: EmpathyStickyItem[],
): Stage4DiscoveriesData {
  const empathyMaps = data.empathyMaps.map((m) =>
    m.id === mapId
      ? { ...m, quadrants: { ...m.quadrants, [quadrantId]: items } }
      : m,
  );
  return ensureSubjectEmpathyLinks({ ...data, empathyMaps });
}

export function patchSubjectAndLinkedMap(
  data: Stage4DiscoveriesData,
  subjectId: string,
  patch: Partial<{
    name: string;
    context: string;
    thumbnailUrl: string;
  }>,
): Stage4DiscoveriesData {
  const subjects = data.researchSynthesis.subjects.map((s) =>
    s.id === subjectId ? { ...s, ...patch } : s,
  );
  const subject = subjects.find((s) => s.id === subjectId);
  let empathyMaps = data.empathyMaps;
  if (subject?.empathyMapId) {
    empathyMaps = empathyMaps.map((m) => {
      if (m.id !== subject.empathyMapId) return m;
      return {
        ...m,
        personaName: patch.name !== undefined ? patch.name : m.personaName,
        personaContext:
          patch.context !== undefined ? patch.context : m.personaContext,
        personaThumbnailUrl:
          patch.thumbnailUrl !== undefined
            ? patch.thumbnailUrl
            : m.personaThumbnailUrl,
      };
    });
  }
  return ensureSubjectEmpathyLinks({
    ...data,
    empathyMaps,
    researchSynthesis: { ...data.researchSynthesis, subjects },
  });
}
