import {
  normalizeResearchMediaFiles,
  type ResearchMediaFile,
} from "@/lib/stages/stage4/researchMediaTypes";
import {
  normalizeResearchSubject,
  type ResearchSubject,
} from "@/lib/stages/stage4/researchSynthesisSubject";

export type { ResearchSubject };

/** 단계 4 · 데이터 정리 보드 — HCI 워크북 색상 분류 */
export type SynthesisNoteKind = "quote" | "observation" | "finding";

/** 레거시 need·insight → 발견한 것 */
export function migrateSynthesisNoteKind(kind: string): SynthesisNoteKind {
  if (kind === "quote" || kind === "observation" || kind === "finding") {
    return kind;
  }
  if (kind === "need" || kind === "insight") return "finding";
  return "quote";
}

export const SYNTHESIS_NOTE_KINDS: {
  id: SynthesisNoteKind;
  label: string;
  shortLabel: string;
  colorHint: string;
  description: string;
  legendClass: string;
}[] = [
  {
    id: "quote",
    label: "언급한 것",
    shortLabel: "인용·언급",
    colorHint: "노란색",
    description:
      "조사 중 사용자가 직접 말한 인용구·발화예요. 세션 로그나 디브리핑에서 들은 말을 그대로 적어요.",
    legendClass: "bg-[#ffee58]/45 border-[#f4d03f]/60",
  },
  {
    id: "observation",
    label: "관찰한 것",
    shortLabel: "행동·관찰",
    colorHint: "연황색",
    description:
      "현장에서 본 행동·반응·환경이에요. 말로 드러나지 않아도 관찰로 포착한 사실·패턴을 적어요.",
    legendClass: "bg-[#ffe0b2]/55 border-[#ffcc80]/70",
  },
  {
    id: "finding",
    label: "발견한 것",
    shortLabel: "발견",
    colorHint: "파란색",
    description:
      "조사 과정에서 조사자에게 떠오른 생각·인사이트를 직접 적어요. 사용자 발화(언급)나 현장 관찰과 구분해서 적어 주세요. 니즈는 다음 단계에서 다룹니다.",
    legendClass: "bg-[#b3e5fc]/50 border-[#81d4fa]/50",
  },
];

export function getSynthesisKindMeta(kind: SynthesisNoteKind) {
  return SYNTHESIS_NOTE_KINDS.find((k) => k.id === kind)!;
}

export type Stage4WorkflowPhase = "empathy_maps" | "research_synthesis";

export interface SynthesisNote {
  id: string;
  subjectId: string;
  kind: SynthesisNoteKind;
  text: string;
  theme: string;
  sourceRef?: string;
}

export interface ResearchSynthesisData {
  subjects: ResearchSubject[];
  notes: SynthesisNote[];
  themes: string[];
  teamDebriefNote: string;
  /** 팀 디브리핑 세션 음성 */
  teamDebriefMediaFiles: ResearchMediaFile[];
  stage3Imported: boolean;
  empathyImported: boolean;
}

export function createResearchSubject(index = 0): ResearchSubject {
  return {
    id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    name: "",
    context: "",
    thumbnailUrl: "",
    researchMethodId: "",
    conductedAt: "",
    mediaFiles: [],
  };
}

export function createSynthesisNote(
  subjectId: string,
  kind: SynthesisNoteKind,
): SynthesisNote {
  return {
    id: `sn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    subjectId,
    kind,
    text: "",
    theme: "",
  };
}

export function defaultResearchSynthesis(): ResearchSynthesisData {
  const subject = createResearchSubject(0);
  return {
    subjects: [subject],
    notes: [],
    themes: [],
    teamDebriefNote: "",
    teamDebriefMediaFiles: [],
    stage3Imported: false,
    empathyImported: false,
  };
}

export function normalizeResearchSynthesis(
  raw: Partial<ResearchSynthesisData> | null | undefined,
): ResearchSynthesisData {
  const base = defaultResearchSynthesis();
  if (!raw) return base;

  const subjects =
    Array.isArray(raw.subjects) && raw.subjects.length
      ? raw.subjects
          .slice(0, 12)
          .map((s, idx) =>
            normalizeResearchSubject(
              s as Parameters<typeof normalizeResearchSubject>[0],
              idx,
              createResearchSubject(idx).id,
            ),
          )
      : base.subjects;

  const notes = Array.isArray(raw.notes)
    ? raw.notes
        .filter((n) => n && typeof n.subjectId === "string")
        .map((n) => ({
          id: n.id || createSynthesisNote(n.subjectId, n.kind || "quote").id,
          subjectId: n.subjectId,
          kind: migrateSynthesisNoteKind(String(n.kind ?? "quote")),
          text: n.text || "",
          theme: n.theme || "",
          sourceRef: n.sourceRef,
        }))
    : [];

  const themes = Array.isArray(raw.themes)
    ? raw.themes.map((t) => String(t).trim()).filter(Boolean).slice(0, 16)
    : [];

  return {
    subjects,
    notes,
    themes,
    teamDebriefNote: raw.teamDebriefNote || "",
    teamDebriefMediaFiles: normalizeResearchMediaFiles(
      (raw as { teamDebriefMediaFiles?: unknown }).teamDebriefMediaFiles,
    ),
    stage3Imported: Boolean(raw.stage3Imported),
    empathyImported: Boolean(raw.empathyImported),
  };
}

export function notesForSubject(
  data: ResearchSynthesisData,
  subjectId: string,
  kind?: SynthesisNoteKind,
): SynthesisNote[] {
  return data.notes.filter(
    (n) =>
      n.subjectId === subjectId && (kind === undefined || n.kind === kind),
  );
}

export function countNotesByKind(
  data: ResearchSynthesisData,
  subjectId: string,
): Record<SynthesisNoteKind, number> {
  const counts: Record<SynthesisNoteKind, number> = {
    quote: 0,
    observation: 0,
    finding: 0,
  };
  for (const n of data.notes) {
    if (n.subjectId !== subjectId || !n.text.trim()) continue;
    counts[n.kind] += 1;
  }
  return counts;
}

export function hasResearchSynthesisContent(
  synthesis: ResearchSynthesisData,
): boolean {
  if (synthesis.teamDebriefNote.trim()) return true;
  if (synthesis.teamDebriefMediaFiles.length > 0) return true;
  if (synthesis.themes.some((t) => t.trim())) return true;
  return synthesis.notes.some((n) => n.text.trim());
}

/** 데이터 정리 기본 빈 슬롯(이름·내용 없음) 제외 */
export function isMeaningfulResearchSubject(
  subject: ResearchSubject,
  notes: SynthesisNote[],
): boolean {
  if (
    subject.name.trim() ||
    subject.context.trim() ||
    subject.thumbnailUrl.trim()
  ) {
    return true;
  }
  if (subject.sourceRespondentId || subject.empathyMapId) {
    return true;
  }
  if (subject.researchMethodId || subject.conductedAt.trim()) {
    return true;
  }
  if (subject.mediaFiles.length > 0) {
    return true;
  }
  return notes.some((n) => n.subjectId === subject.id && n.text.trim());
}

export function filterMeaningfulResearchSubjects(
  synthesis: Pick<ResearchSynthesisData, "subjects" | "notes">,
): ResearchSubject[] {
  return synthesis.subjects.filter((subject) =>
    isMeaningfulResearchSubject(subject, synthesis.notes),
  );
}
