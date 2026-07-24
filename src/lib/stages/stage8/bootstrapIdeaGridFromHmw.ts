import type { HmwQuestion, Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";
import {
  filledIdeaCount,
  IDEA_GRID_SIZE,
  resizeIdeaGrid,
  type IdeaGridData,
  type IdeaSketch,
} from "@/lib/stages/stage8/ideaGridTypes";

export function filledHmwQuestions(questions: HmwQuestion[]): HmwQuestion[] {
  return questions.filter((q) => q.hmwText.trim());
}

/** 7단계 HMW 변경 감지용 — cellHmwIds 재배치 트리거 (전체 질문) */
export function hmwGridSyncKey(hmw: Stage7HmwData): string {
  return `${hmw.stage5SyncedAt}|len:${hmw.questions.length}|${hmw.questions
    .map((q) => `${q.id}:${q.latentNeedText.trim()}:${q.hmwText.trim()}`)
    .join(";")}`;
}

/** HMW 개수만큼 칸 (없으면 기본 9칸) */
export function ideaGridSizeForHmw(hmw: Stage7HmwData): number {
  return hmw.questions.length > 0 ? hmw.questions.length : IDEA_GRID_SIZE;
}

/**
 * 질문 순서대로 칸에 HMW를 배치.
 * 이미 칸/아이디어에 연결된 HMW가 목록에 있으면 그 칸을 우선 유지하고,
 * 나머지 질문은 빈 칸·남은 인덱스에 채웁니다.
 */
function buildCellHmwIds(
  questions: HmwQuestion[],
  grid: IdeaGridData,
  size: number,
): { cellHmwIds: string[]; slots: (IdeaSketch | null)[] } {
  const questionIds = new Set(questions.map((q) => q.id));
  const cellHmwIds = Array.from({ length: size }, () => "");
  const slots = Array.from({ length: size }, () => null as IdeaSketch | null);
  const usedQuestionIds = new Set<string>();

  // 1) 기존 아이디어의 sourceHmwId로 칸 고정
  for (let i = 0; i < grid.slots.length; i += 1) {
    const slot = grid.slots[i];
    if (!slot?.sourceHmwId || !questionIds.has(slot.sourceHmwId)) continue;
    if (usedQuestionIds.has(slot.sourceHmwId)) continue;
    // 가능하면 같은 인덱스, 아니면 다음 빈 칸
    let target = i < size ? i : -1;
    if (target < 0 || cellHmwIds[target]) {
      target = cellHmwIds.findIndex((id) => !id);
    }
    if (target < 0) continue;
    cellHmwIds[target] = slot.sourceHmwId;
    slots[target] = slot;
    usedQuestionIds.add(slot.sourceHmwId);
  }

  // 2) 저장된 cellHmwIds 유지
  for (let i = 0; i < Math.min(grid.cellHmwIds.length, size); i += 1) {
    const stored = grid.cellHmwIds[i];
    if (!stored || !questionIds.has(stored) || usedQuestionIds.has(stored)) {
      continue;
    }
    if (cellHmwIds[i]) {
      const empty = cellHmwIds.findIndex((id) => !id);
      if (empty < 0) continue;
      cellHmwIds[empty] = stored;
      if (grid.slots[i] && !slots[empty]) slots[empty] = grid.slots[i]!;
    } else {
      cellHmwIds[i] = stored;
      if (grid.slots[i] && !slots[i]) slots[i] = grid.slots[i]!;
    }
    usedQuestionIds.add(stored);
  }

  // 3) 아직 없는 질문은 순서대로 빈 칸에
  for (const q of questions) {
    if (usedQuestionIds.has(q.id)) continue;
    const empty = cellHmwIds.findIndex((id) => !id);
    if (empty < 0) break;
    cellHmwIds[empty] = q.id;
    usedQuestionIds.add(q.id);
  }

  // 4) 연결되지 않은 기존 아이디어(고아)는 빈 칸에 보존
  for (let i = 0; i < grid.slots.length; i += 1) {
    const slot = grid.slots[i];
    if (!slot?.title.trim()) continue;
    if (slots.some((s) => s?.id === slot.id)) continue;
    const empty = slots.findIndex((s) => !s);
    if (empty < 0) break;
    slots[empty] = slot;
    if (!cellHmwIds[empty] && slot.sourceHmwId && questionIds.has(slot.sourceHmwId)) {
      cellHmwIds[empty] = slot.sourceHmwId;
    }
  }

  return { cellHmwIds, slots };
}

/**
 * 7단계 HMW 전체(개수만큼)를 그리드 칸에 배치합니다.
 */
export function bootstrapIdeaGridFromHmw(
  grid: IdeaGridData,
  hmw: Stage7HmwData,
): IdeaGridData {
  const syncKey = hmwGridSyncKey(hmw);
  const targetSize = ideaGridSizeForHmw(hmw);
  const needsCellSync =
    grid.hmwSyncedAt !== syncKey ||
    grid.cellHmwIds.length !== targetSize ||
    grid.slots.length !== targetSize;

  let next = grid;

  if (needsCellSync) {
    const resized = resizeIdeaGrid(grid, targetSize);
    const { cellHmwIds, slots } = buildCellHmwIds(
      hmw.questions,
      resized,
      targetSize,
    );
    next = {
      ...resized,
      cellHmwIds,
      slots,
      hmwSyncedAt: syncKey,
    };
  }

  if (filledIdeaCount(next) === 0) {
    next = {
      ...next,
      activeView: "grid",
      selectedCellIndex: null,
    };
  }

  return next;
}

export function hmwForCell(
  grid: IdeaGridData,
  hmwQuestions: HmwQuestion[],
  cellIndex: number,
): HmwQuestion | null {
  const id = grid.cellHmwIds[cellIndex];
  if (!id) return null;
  return hmwQuestions.find((q) => q.id === id) ?? null;
}
