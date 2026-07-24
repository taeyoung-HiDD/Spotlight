import type { ScamperLetter } from "@/lib/stages/stage8/scamperCatalog";

/** 기본·최소 그리드 칸 수 (HMW가 없을 때) */
export const IDEA_GRID_SIZE = 9;

export type IdeaGridView =
  | "grid"
  | "editor"
  | "scamper"
  | "hmw_setup"
  | "principle"
  | "team_persona";

export type IdeaStimulusType = "scamper" | "principle_card" | "team_persona";

export interface IdeaSketch {
  id: string;
  title: string;
  description: string;
  tags: string[];
  /** 사용자가 올린 스케치 */
  sketchDataUrl: string;
  /** AI가 만든 참고 시각 사례 (사용자 스케치를 덮지 않음) */
  referenceSketchDataUrl?: string;
  sourceHmwId: string;
  sourceHmwText: string;
  scamperLetter?: ScamperLetter;
  parentIdeaId?: string;
  stimulusId?: string;
  stimulusType?: IdeaStimulusType;
}

export interface IdeaGridData {
  slots: (IdeaSketch | null)[];
  /** 칸별 연결 HMW 질문 id (슬롯과 동일 길이) */
  cellHmwIds: string[];
  selectedCellIndex: number | null;
  activeView: IdeaGridView;
  scamperSourceIdeaId: string;
  scamperLetterIndex: number;
  hmwSyncedAt: string;
  /** 보류(은행)에 둔 아이디어 */
  bankedIdeas: IdeaSketch[];
  /** 경쟁사 링을 먼저 연 세션 (베타 계측) */
  competitorRingUnlockedEarly: boolean;
}

export function createIdeaId(): string {
  return `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function ideaGridCellCount(data: IdeaGridData): number {
  return Math.max(data.slots.length, data.cellHmwIds.length, 1);
}

export function defaultIdeaGrid(): IdeaGridData {
  return {
    slots: Array.from({ length: IDEA_GRID_SIZE }, () => null),
    cellHmwIds: Array.from({ length: IDEA_GRID_SIZE }, () => ""),
    selectedCellIndex: null,
    activeView: "grid",
    scamperSourceIdeaId: "",
    scamperLetterIndex: 0,
    hmwSyncedAt: "",
    bankedIdeas: [],
    competitorRingUnlockedEarly: false,
  };
}

export function filledIdeaCount(data: IdeaGridData): number {
  return data.slots.filter((slot) => slot && slot.title.trim()).length;
}

export function hasIdeaGridContent(data: IdeaGridData): boolean {
  return filledIdeaCount(data) > 0;
}

export function firstEmptyCellIndex(data: IdeaGridData): number | null {
  const idx = data.slots.findIndex((slot) => !slot?.title.trim());
  return idx >= 0 ? idx : null;
}

function normalizeIdea(raw: unknown): IdeaSketch | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? "").trim();
  if (!title) return null;
  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === "string")
    : [];
  return {
    id: String(o.id ?? createIdeaId()).trim() || createIdeaId(),
    title,
    description: String(o.description ?? ""),
    tags,
    sketchDataUrl: String(o.sketchDataUrl ?? ""),
    referenceSketchDataUrl: o.referenceSketchDataUrl
      ? String(o.referenceSketchDataUrl)
      : undefined,
    sourceHmwId: String(o.sourceHmwId ?? ""),
    sourceHmwText: String(o.sourceHmwText ?? ""),
    scamperLetter: o.scamperLetter as ScamperLetter | undefined,
    parentIdeaId: o.parentIdeaId ? String(o.parentIdeaId) : undefined,
    stimulusId: o.stimulusId ? String(o.stimulusId) : undefined,
    stimulusType:
      o.stimulusType === "scamper" ||
      o.stimulusType === "principle_card" ||
      o.stimulusType === "team_persona"
        ? o.stimulusType
        : undefined,
  };
}

/** 저장된 슬롯 길이를 존중하되, 비어 있으면 기본 9칸 */
export function normalizeIdeaGrid(
  partial: Partial<IdeaGridData> | null | undefined,
): IdeaGridData {
  if (!partial) return defaultIdeaGrid();

  const rawSlots = Array.isArray(partial.slots) ? partial.slots : [];
  const rawIds = Array.isArray(partial.cellHmwIds) ? partial.cellHmwIds : [];
  const size = Math.max(rawSlots.length, rawIds.length, IDEA_GRID_SIZE);

  const slots = Array.from({ length: size }, (_, index) => {
    const raw = rawSlots[index];
    if (!raw) return null;
    return normalizeIdea(raw);
  });
  const cellHmwIds = Array.from({ length: size }, (_, index) => {
    const id = rawIds[index];
    return typeof id === "string" ? id : "";
  });

  const selected =
    typeof partial.selectedCellIndex === "number" &&
    partial.selectedCellIndex >= 0 &&
    partial.selectedCellIndex < size
      ? partial.selectedCellIndex
      : null;
  const view =
    partial.activeView === "editor" ||
    partial.activeView === "scamper" ||
    partial.activeView === "hmw_setup" ||
    partial.activeView === "principle" ||
    partial.activeView === "team_persona" ||
    partial.activeView === "grid"
      ? partial.activeView
      : "grid";
  const letterIndex =
    typeof partial.scamperLetterIndex === "number" &&
    partial.scamperLetterIndex >= 0 &&
    partial.scamperLetterIndex < 7
      ? partial.scamperLetterIndex
      : 0;
  const filled = slots.filter((slot) => slot && slot.title.trim()).length;
  const bankedIdeas = Array.isArray(partial.bankedIdeas)
    ? partial.bankedIdeas
        .map(normalizeIdea)
        .filter((idea): idea is IdeaSketch => idea !== null)
    : [];
  return {
    slots,
    cellHmwIds,
    selectedCellIndex: selected,
    activeView: filled === 0 && view === "editor" ? "grid" : view,
    scamperSourceIdeaId: String(partial.scamperSourceIdeaId ?? ""),
    scamperLetterIndex: letterIndex,
    hmwSyncedAt: String(partial.hmwSyncedAt ?? ""),
    bankedIdeas,
    competitorRingUnlockedEarly:
      partial.competitorRingUnlockedEarly === true,
  };
}

/** 그리드 칸 수를 맞추며 기존 아이디어·HMW 연결을 최대한 유지 */
export function resizeIdeaGrid(
  data: IdeaGridData,
  size: number,
): IdeaGridData {
  const nextSize = Math.max(1, size);
  const slots = Array.from({ length: nextSize }, (_, i) => data.slots[i] ?? null);
  const cellHmwIds = Array.from(
    { length: nextSize },
    (_, i) => data.cellHmwIds[i] ?? "",
  );
  const selected =
    data.selectedCellIndex != null &&
    data.selectedCellIndex >= 0 &&
    data.selectedCellIndex < nextSize
      ? data.selectedCellIndex
      : null;
  return {
    ...data,
    slots,
    cellHmwIds,
    selectedCellIndex: selected,
  };
}

export function upsertIdeaAtCell(
  data: IdeaGridData,
  cellIndex: number,
  idea: IdeaSketch,
): IdeaGridData {
  if (cellIndex < 0 || cellIndex >= data.slots.length) return data;
  const slots = [...data.slots];
  slots[cellIndex] = idea;
  return { ...data, slots, selectedCellIndex: cellIndex, activeView: "grid" };
}

export function clearIdeaAtCell(
  data: IdeaGridData,
  cellIndex: number,
): IdeaGridData {
  if (cellIndex < 0 || cellIndex >= data.slots.length) return data;
  const slots = [...data.slots];
  slots[cellIndex] = null;
  return {
    ...data,
    slots,
    selectedCellIndex:
      data.selectedCellIndex === cellIndex ? null : data.selectedCellIndex,
    activeView: "grid",
  };
}

export function addIdeaToNextEmpty(
  data: IdeaGridData,
  idea: Omit<IdeaSketch, "id"> & { id?: string },
): IdeaGridData {
  const index = firstEmptyCellIndex(data);
  if (index === null) return data;
  return upsertIdeaAtCell(data, index, {
    ...idea,
    id: idea.id ?? createIdeaId(),
  });
}

export function ideaById(
  data: IdeaGridData,
  ideaId: string,
): { idea: IdeaSketch; cellIndex: number } | null {
  const cellIndex = data.slots.findIndex((slot) => slot?.id === ideaId);
  if (cellIndex < 0 || !data.slots[cellIndex]) return null;
  return { idea: data.slots[cellIndex]!, cellIndex };
}
