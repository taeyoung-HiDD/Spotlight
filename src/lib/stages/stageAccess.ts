import { STAGE_COUNT } from "@/lib/stages/constants";

/** 한 번 도달한 구간(maxReached) 안에서, 선행 단계가 완료된 세부 단계만 이동 가능 */
export function canNavigateToStage(
  stage: number,
  completedStages: number[],
  currentStage: number,
  maxReachedStage: number,
): boolean {
  if (stage < 1 || stage > STAGE_COUNT) return false;
  if (stage > maxReachedStage) return false;
  if (stage === currentStage) return true;
  for (let s = 1; s < stage; s++) {
    if (!completedStages.includes(s)) return false;
  }
  return true;
}
