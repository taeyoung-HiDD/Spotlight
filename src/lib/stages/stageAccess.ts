import { STAGE_COUNT } from "@/lib/stages/constants";

/** 사이드바에서 1~STAGE_COUNT 모든 단계로 자유 이동 가능 */
export function canNavigateToStage(
  stage: number,
  _completedStages: number[] = [],
  _currentStage = 1,
  _maxReachedStage = STAGE_COUNT,
): boolean {
  return stage >= 1 && stage <= STAGE_COUNT;
}
