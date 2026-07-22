import { mergeStage5IntoHmw } from "@/lib/stages/stage7/bootstrapHmwFromStage5";
import {
  createHmwQuestionId,
  type HmwQuestion,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import {
  createStage5BoardPostit,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { hmwForCell } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import { IDEA_GRID_SIZE, type IdeaGridData } from "@/lib/stages/stage8/ideaGridTypes";

export type GridCellHmwState = "empty" | "need_only" | "hmw_ready";

export function getGridCellHmwState(
  question: HmwQuestion | null,
): GridCellHmwState {
  if (!question?.latentNeedText.trim()) return "empty";
  if (!question.hmwText.trim()) return "need_only";
  return "hmw_ready";
}

export function shouldOpenIdeaEditor(
  grid: IdeaGridData,
  question: HmwQuestion | null,
  cellIndex: number,
): boolean {
  const hasIdea = Boolean(grid.slots[cellIndex]?.title.trim());
  return hasIdea || getGridCellHmwState(question) === "hmw_ready";
}

function resolveSubjectId(stage5: Stage5LatentNeedsData): {
  subjectId: string;
  subjects: Stage5LatentNeedsData["subjects"];
} {
  if (stage5.subjects.length > 0) {
    return { subjectId: stage5.subjects[0]!.id, subjects: stage5.subjects };
  }
  const subjectId = `subject-grid-${Date.now()}`;
  return {
    subjectId,
    subjects: [
      {
        id: subjectId,
        name: "아이디어 펼치기",
        context: "",
        thumbnailUrl: "",
      },
    ],
  };
}

function addLatentNeedToStage5(
  stage5: Stage5LatentNeedsData,
  text: string,
): { stage5: Stage5LatentNeedsData; needId: string; subjectId: string } {
  const { subjectId, subjects } = resolveSubjectId(stage5);
  const needId = `s5p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const postit = createStage5BoardPostit(subjectId, "latent_need", {
    id: needId,
    text,
    readonly: false,
  });
  return {
    stage5: { ...stage5, subjects, postits: [...stage5.postits, postit] },
    needId,
    subjectId,
  };
}

function assignCellHmw(
  grid: IdeaGridData,
  cellIndex: number,
  questionId: string,
): IdeaGridData {
  const cellHmwIds = [...grid.cellHmwIds];
  while (cellHmwIds.length < IDEA_GRID_SIZE) {
    cellHmwIds.push("");
  }
  cellHmwIds[cellIndex] = questionId;
  return {
    ...grid,
    cellHmwIds,
    activeView: "grid",
    selectedCellIndex: null,
  };
}

/** 그리드 칸에서 잠재 니즈·HMW 질문을 저장 (5·7단계 자료 동기화) */
export function saveGridCellNeedHmw({
  grid,
  hmw,
  stage5,
  cellIndex,
  latentNeedText,
  hmwText,
}: {
  grid: IdeaGridData;
  hmw: Stage7HmwData;
  stage5: Stage5LatentNeedsData;
  cellIndex: number;
  latentNeedText: string;
  hmwText: string;
}): {
  grid: IdeaGridData;
  hmw: Stage7HmwData;
  stage5: Stage5LatentNeedsData;
} {
  const trimmedNeed = latentNeedText.trim();
  const trimmedHmw = hmwText.trim();
  const existing = hmwForCell(grid, hmw.questions, cellIndex);

  if (existing) {
    let nextStage5 = stage5;
    const needPostit = nextStage5.postits.find(
      (p) => p.id === existing.latentNeedId,
    );
    if (needPostit) {
      nextStage5 = {
        ...nextStage5,
        postits: nextStage5.postits.map((p) =>
          p.id === existing.latentNeedId ? { ...p, text: trimmedNeed } : p,
        ),
      };
    } else if (trimmedNeed) {
      const added = addLatentNeedToStage5(nextStage5, trimmedNeed);
      nextStage5 = added.stage5;
    }

    const nextHmw: Stage7HmwData = {
      ...hmw,
      questions: hmw.questions.map((q) =>
        q.id === existing.id
          ? {
              ...q,
              latentNeedText: trimmedNeed,
              hmwText: trimmedHmw,
              kevinGenerated: false,
            }
          : q,
      ),
    };

    return {
      grid: assignCellHmw(grid, cellIndex, existing.id),
      hmw: nextHmw,
      stage5: nextStage5,
    };
  }

  const { stage5: nextStage5, needId } = addLatentNeedToStage5(
    stage5,
    trimmedNeed,
  );
  let nextHmw = mergeStage5IntoHmw(hmw, nextStage5);
  const matched = nextHmw.questions.find((q) => q.latentNeedId === needId);
  const questionId = matched?.id ?? createHmwQuestionId();

  if (!matched) {
    const { subjectId } = resolveSubjectId(nextStage5);
    nextHmw = {
      ...nextHmw,
      questions: [
        ...nextHmw.questions,
        {
          id: questionId,
          latentNeedId: needId,
          subjectId,
          latentNeedText: trimmedNeed,
          hmwText: trimmedHmw,
          kevinGenerated: false,
        },
      ],
    };
  } else {
    nextHmw = {
      ...nextHmw,
      questions: nextHmw.questions.map((q) =>
        q.latentNeedId === needId
          ? { ...q, hmwText: trimmedHmw, kevinGenerated: false }
          : q,
      ),
    };
  }

  return {
    grid: assignCellHmw(grid, cellIndex, questionId),
    hmw: nextHmw,
    stage5: nextStage5,
  };
}
