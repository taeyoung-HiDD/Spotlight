import { NEED_QUADRANT_LABELS } from "@/lib/stages/stage5/latentNeedsCoreSelection";
import type {
  NeedQuadrantCell,
  Stage5BoardPostit,
  Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import {
  applyGeneratedHmw,
  applyHeuristicHmwDrafts,
  type GenerateHmwItemResult,
} from "@/lib/stages/stage7/generateHmwClient";
import {
  createHmwQuestionId,
  type HmwQuestion,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import { hmwGridSyncKey } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import {
  resizeIdeaGrid,
  type IdeaGridData,
} from "@/lib/stages/stage8/ideaGridTypes";

/** 중요도 우선 사분면 꺼내기 순서 */
export const QUADRANT_PULL_ORDER: NeedQuadrantCell[] = [
  "high_importance_high_gap",
  "high_importance_low_gap",
  "low_importance_high_gap",
  "low_importance_low_gap",
];

export type NextQuadrantPull = {
  cell: NeedQuadrantCell;
  label: string;
  needs: Stage5BoardPostit[];
};

export function usedLatentNeedIds(hmw: Stage7HmwData): Set<string> {
  return new Set(hmw.questions.map((q) => q.latentNeedId).filter(Boolean));
}

/** 해당 셀에 배치·미보류·미사용 잠재 니즈 */
export function listPullableNeedsForCell(
  stage5: Stage5LatentNeedsData,
  cell: NeedQuadrantCell,
  usedNeedIds: Set<string>,
): Stage5BoardPostit[] {
  const parked = new Set(stage5.parkedNeedIds ?? []);
  return stage5.postits.filter(
    (p) =>
      p.kind === "latent_need" &&
      Boolean(p.text.trim()) &&
      stage5.needRatings?.[p.id]?.cell === cell &&
      !parked.has(p.id) &&
      !usedNeedIds.has(p.id),
  );
}

/** 우선순위상 다음에 꺼낼 사분면 + 니즈 (없으면 null) */
export function findNextQuadrantToPull(
  stage5: Stage5LatentNeedsData,
  usedNeedIds: Set<string>,
): NextQuadrantPull | null {
  for (const cell of QUADRANT_PULL_ORDER) {
    const needs = listPullableNeedsForCell(stage5, cell, usedNeedIds);
    if (needs.length === 0) continue;
    return {
      cell,
      label: NEED_QUADRANT_LABELS[cell],
      needs,
    };
  }
  return null;
}

function ensureQuestionsForNeeds(
  hmw: Stage7HmwData,
  needs: Stage5BoardPostit[],
): { hmw: Stage7HmwData; questionIds: string[] } {
  const byNeedId = new Map(hmw.questions.map((q) => [q.latentNeedId, q]));
  const questions = [...hmw.questions];
  const questionIds: string[] = [];

  for (const need of needs) {
    const existing = byNeedId.get(need.id);
    if (existing) {
      questionIds.push(existing.id);
      continue;
    }
    const question: HmwQuestion = {
      id: createHmwQuestionId(),
      latentNeedId: need.id,
      subjectId: need.subjectId,
      latentNeedText: need.text.trim(),
      hmwText: "",
    };
    questions.push(question);
    byNeedId.set(need.id, question);
    questionIds.push(question.id);
  }

  return { hmw: { ...hmw, questions }, questionIds };
}

/** 니즈를 HMW 질문으로만 추가(본문은 비움) — 생성 API 입력용 */
export function prepareHmwQuestionsForNeeds(
  hmw: Stage7HmwData,
  needs: Stage5BoardPostit[],
): Stage7HmwData {
  return ensureQuestionsForNeeds(hmw, needs).hmw;
}

/**
 * 생성된 HMW를 7단계에 반영하고 그리드 칸을 확장·연결합니다.
 */
export function appendGeneratedHmwToGrid({
  grid,
  hmw,
  needs,
  generatedItems,
}: {
  grid: IdeaGridData;
  hmw: Stage7HmwData;
  needs: Stage5BoardPostit[];
  generatedItems?: GenerateHmwItemResult[];
}): { grid: IdeaGridData; hmw: Stage7HmwData } {
  const ensured = ensureQuestionsForNeeds(hmw, needs);
  let nextHmw = ensured.hmw;

  if (generatedItems && generatedItems.length > 0) {
    nextHmw = applyGeneratedHmw(nextHmw, generatedItems);
  }

  // 아직 비어 있는 확장분은 휴리스틱으로 채움
  const stillEmpty = nextHmw.questions.some(
    (q) =>
      ensured.questionIds.includes(q.id) &&
      q.latentNeedText.trim() &&
      !q.hmwText.trim(),
  );
  if (stillEmpty) {
    nextHmw = applyHeuristicHmwDrafts(nextHmw);
  }

  const newQuestionIds = ensured.questionIds.filter(
    (id) => !grid.cellHmwIds.includes(id),
  );
  const targetSize = Math.max(
    grid.slots.length,
    grid.cellHmwIds.length,
    nextHmw.questions.length,
    grid.cellHmwIds.length + newQuestionIds.length,
  );
  let nextGrid = resizeIdeaGrid(grid, targetSize);
  const cellHmwIds = [...nextGrid.cellHmwIds];

  for (const questionId of newQuestionIds) {
    const empty = cellHmwIds.findIndex((id) => !id);
    if (empty >= 0) {
      cellHmwIds[empty] = questionId;
    } else {
      cellHmwIds.push(questionId);
    }
  }

  if (cellHmwIds.length < nextHmw.questions.length) {
    nextGrid = resizeIdeaGrid(
      { ...nextGrid, cellHmwIds },
      nextHmw.questions.length,
    );
    const expanded = [...nextGrid.cellHmwIds];
    for (const q of nextHmw.questions) {
      if (expanded.includes(q.id)) continue;
      const empty = expanded.findIndex((id) => !id);
      if (empty >= 0) expanded[empty] = q.id;
      else expanded.push(q.id);
    }
    nextGrid = {
      ...nextGrid,
      cellHmwIds: expanded,
      slots: Array.from(
        { length: Math.max(expanded.length, nextGrid.slots.length) },
        (_, i) => nextGrid.slots[i] ?? null,
      ),
      hmwSyncedAt: hmwGridSyncKey(nextHmw),
    };
  } else {
    nextGrid = {
      ...nextGrid,
      cellHmwIds,
      hmwSyncedAt: hmwGridSyncKey(nextHmw),
    };
  }

  return { grid: nextGrid, hmw: nextHmw };
}

/** UI용: 다음에 꺼낼 사분면 요약 */
export function nextQuadrantPullHint(
  stage5: Stage5LatentNeedsData,
  hmw: Stage7HmwData,
): NextQuadrantPull | null {
  return findNextQuadrantToPull(stage5, usedLatentNeedIds(hmw));
}
