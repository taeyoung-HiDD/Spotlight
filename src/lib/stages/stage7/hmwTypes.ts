import type { Stage5SubjectRef } from "@/lib/stages/stage5/latentNeedsTypes";

export interface HmwQuestion {
  id: string;
  latentNeedId: string;
  subjectId: string;
  /** 5단계 잠재 니즈 스냅샷 */
  latentNeedText: string;
  hmwText: string;
  kevinGenerated?: boolean;
}

export interface Stage7HmwData {
  subjects: Stage5SubjectRef[];
  questions: HmwQuestion[];
  stage5SyncedAt: string;
  kevinGeneratedAt: string;
}

export function createHmwQuestionId(): string {
  return `hmw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isManualHmwQuestion(question: HmwQuestion): boolean {
  return question.latentNeedId.startsWith("manual-");
}

export function addManualHmwQuestion(data: Stage7HmwData): Stage7HmwData {
  const manualSubjectId = "manual-subject";
  const subjects =
    data.subjects.length > 0
      ? data.subjects
      : [
          {
            id: manualSubjectId,
            name: "직접 입력",
            context: "",
            thumbnailUrl: "",
            researchMethodId: "" as const,
          },
        ];
  const subjectId = subjects[0]?.id ?? manualSubjectId;
  const question: HmwQuestion = {
    id: createHmwQuestionId(),
    latentNeedId: `manual-${createHmwQuestionId()}`,
    subjectId,
    latentNeedText: "",
    hmwText: "",
  };
  return {
    ...data,
    subjects,
    questions: [...data.questions, question],
  };
}

export function defaultStage7Hmw(): Stage7HmwData {
  return {
    subjects: [],
    questions: [],
    stage5SyncedAt: "",
    kevinGeneratedAt: "",
  };
}

export function hasHmwContent(data: Stage7HmwData): boolean {
  return data.questions.some((q) => q.hmwText.trim());
}

export function hasLatentNeedPool(data: Stage7HmwData): boolean {
  return data.questions.some((q) => q.latentNeedText.trim());
}

function normalizeQuestion(raw: unknown): HmwQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const latentNeedId = String(o.latentNeedId ?? "").trim();
  const subjectId = String(o.subjectId ?? "").trim();
  const latentNeedText = String(o.latentNeedText ?? "").trim();
  if (!latentNeedId && !latentNeedText) return null;
  return {
    id: String(o.id ?? createHmwQuestionId()).trim() || createHmwQuestionId(),
    latentNeedId: latentNeedId || `orphan-${createHmwQuestionId()}`,
    subjectId,
    latentNeedText,
    hmwText: String(o.hmwText ?? ""),
    kevinGenerated: o.kevinGenerated === true,
  };
}

function normalizeSubject(raw: unknown): Stage5SubjectRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    name: String(o.name ?? ""),
    context: String(o.context ?? ""),
    thumbnailUrl: String(o.thumbnailUrl ?? ""),
    researchMethodId: (o.researchMethodId as Stage5SubjectRef["researchMethodId"]) ?? "",
    conductedAt: o.conductedAt ? String(o.conductedAt) : undefined,
  };
}

export function normalizeStage7Hmw(
  partial: Partial<Stage7HmwData> | null | undefined,
): Stage7HmwData {
  if (!partial) return defaultStage7Hmw();
  const subjects = Array.isArray(partial.subjects)
    ? partial.subjects
        .map(normalizeSubject)
        .filter((s): s is Stage5SubjectRef => s !== null)
    : [];
  const questions = Array.isArray(partial.questions)
    ? partial.questions
        .map(normalizeQuestion)
        .filter((q): q is HmwQuestion => q !== null)
    : [];
  return {
    subjects,
    questions,
    stage5SyncedAt: String(partial.stage5SyncedAt ?? ""),
    kevinGeneratedAt: String(partial.kevinGeneratedAt ?? ""),
  };
}

export function updateHmwQuestion(
  data: Stage7HmwData,
  id: string,
  hmwText: string,
): Stage7HmwData {
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.id === id ? { ...q, hmwText, kevinGenerated: false } : q,
    ),
  };
}

export function updateHmwLatentNeed(
  data: Stage7HmwData,
  id: string,
  latentNeedText: string,
): Stage7HmwData {
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.id === id ? { ...q, latentNeedText, kevinGenerated: false } : q,
    ),
  };
}
