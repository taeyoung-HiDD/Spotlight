import { STAGE_COUNT } from "@/lib/stages/constants";
import { ENTRY_POINTS } from "@/lib/projects/constants";

function clampStage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(STAGE_COUNT, Math.max(1, Math.round(n)));
}

/** current_phase 문자열에서 단계 번호 추출 (예: 「공감하기 · 단계 3」, stage_4) */
export function parseStageFromCurrentPhase(
  currentPhase: string | null,
): number | null {
  if (!currentPhase?.trim()) return null;

  const kr = currentPhase.match(/단계\s*(\d{1,2})/);
  if (kr) {
    const n = Number.parseInt(kr[1]!, 10);
    if (n >= 1 && n <= STAGE_COUNT) return n;
  }

  const en = currentPhase.match(/stage[_\s-]?(\d{1,2})/i);
  if (en) {
    const n = Number.parseInt(en[1]!, 10);
    if (n >= 1 && n <= STAGE_COUNT) return n;
  }

  return null;
}

/** 진입점 메타만 있을 때의 시작 단계 (artifact 없음) */
export function resolveEntryStartStage(currentPhase: string | null): number {
  if (!currentPhase) return 1;
  const entry = ENTRY_POINTS.find((e) => e.currentPhase === currentPhase);
  return entry ? clampStage(entry.startStage) : 1;
}

export type ResolveResumeStageInput = {
  currentPhase: string | null;
  /** artifacts 중 가장 최근 updated_at 행의 stage_id */
  lastWorkedStageId?: number | null;
};

/**
 * 허브 「계속 진행」·이어하기 URL용 단계.
 * 우선순위: 마지막 작업 artifact 단계 → current_phase 파싱 → 진입점 시작 단계.
 */
export function resolveResumeStage(input: ResolveResumeStageInput): number {
  const { currentPhase, lastWorkedStageId } = input;

  if (
    lastWorkedStageId != null &&
    lastWorkedStageId >= 1 &&
    lastWorkedStageId <= STAGE_COUNT
  ) {
    return clampStage(lastWorkedStageId);
  }

  const parsed = parseStageFromCurrentPhase(currentPhase);
  if (parsed != null) return parsed;

  return clampStage(resolveEntryStartStage(currentPhase));
}

/** @deprecated resolveResumeStage({ currentPhase, lastWorkedStageId }) 사용 */
export function resolveResumeStageFromPhaseOnly(
  currentPhase: string | null,
): number {
  return resolveResumeStage({ currentPhase, lastWorkedStageId: null });
}
