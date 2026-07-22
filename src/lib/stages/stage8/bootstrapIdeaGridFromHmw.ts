import type { HmwQuestion, Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";
import {
  filledIdeaCount,
  IDEA_GRID_SIZE,
  type IdeaGridData,
} from "@/lib/stages/stage8/ideaGridTypes";

export function filledHmwQuestions(questions: HmwQuestion[]): HmwQuestion[] {
  return questions.filter((q) => q.hmwText.trim());
}

/** 7단계 HMW 변경 감지용 — cellHmwIds 재배치 트리거 */
export function hmwGridSyncKey(hmw: Stage7HmwData): string {
  const ordered = hmw.questions.slice(0, IDEA_GRID_SIZE);
  return `${hmw.stage5SyncedAt}|len:${hmw.questions.length}|${ordered
    .map((q) => `${q.id}:${q.latentNeedText.trim()}:${q.hmwText.trim()}`)
    .join(";")}`;
}

function buildCellHmwIds(
  questions: HmwQuestion[],
  grid: IdeaGridData,
): string[] {
  return Array.from({ length: IDEA_GRID_SIZE }, (_, cellIndex) => {
    const slot = grid.slots[cellIndex];
    if (
      slot?.sourceHmwId &&
      questions.some((q) => q.id === slot.sourceHmwId)
    ) {
      return slot.sourceHmwId;
    }
    const stored = grid.cellHmwIds[cellIndex];
    if (stored && questions.some((q) => q.id === stored)) {
      return stored;
    }
    return questions[cellIndex]?.id ?? "";
  });
}

/**
 * 7단계 HMW를 9칸에 1:1 배치하고, 아이디어가 없을 때는 그리드 화면부터 보여 줍니다.
 */
export function bootstrapIdeaGridFromHmw(
  grid: IdeaGridData,
  hmw: Stage7HmwData,
): IdeaGridData {
  const syncKey = hmwGridSyncKey(hmw);
  const needsCellSync =
    grid.hmwSyncedAt !== syncKey ||
    grid.cellHmwIds.length !== IDEA_GRID_SIZE;

  let next = grid;

  if (needsCellSync) {
    next = {
      ...next,
      cellHmwIds: buildCellHmwIds(hmw.questions, grid),
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
