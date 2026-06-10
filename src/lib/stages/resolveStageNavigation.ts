import { STAGE_COUNT } from "@/lib/stages/constants";
import { parseStageFromCurrentPhase } from "@/lib/projects/resolveResumeStage";

function clampStage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(STAGE_COUNT, Math.max(1, Math.round(n)));
}

/**
 * 사이드바 잠금 해제용 — 사용자가 한 번이라도 도달한 최고 단계.
 * 현재 URL · artifact 최대 단계 · current_phase · 클라이언트 기록 중 최댓값.
 */
export function resolveMaxReachedStage(input: {
  currentStage: number;
  artifactMaxStage?: number | null;
  currentPhase?: string | null;
  clientMaxStage?: number | null;
}): number {
  const fromPhase = parseStageFromCurrentPhase(input.currentPhase ?? null);
  return clampStage(
    Math.max(
      input.currentStage,
      input.artifactMaxStage ?? 0,
      fromPhase ?? 0,
      input.clientMaxStage ?? 0,
    ),
  );
}

/** maxReached 이전 단계는 탐색 가능·완료로 간주 */
export function completedStagesUpTo(maxReachedStage: number): number[] {
  const n = Math.max(0, maxReachedStage - 1);
  return Array.from({ length: n }, (_, i) => i + 1);
}
