import { STAGE_COUNT } from "@/lib/stages/constants";

function storageKey(projectId: string): string {
  return `spotlight-max-stage:${projectId}`;
}

function clampStage(stage: number): number {
  if (!Number.isFinite(stage)) return 0;
  return Math.min(STAGE_COUNT, Math.max(0, Math.round(stage)));
}

/** 브라우저에 기록된 이 프로젝트 최대 방문 단계 */
export function readClientMaxStage(projectId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return 0;
    return clampStage(Number.parseInt(raw, 10));
  } catch {
    return 0;
  }
}

export function writeClientMaxStage(projectId: string, stage: number): number {
  const next = clampStage(stage);
  if (typeof window === "undefined" || next < 1) return next;
  try {
    const prev = readClientMaxStage(projectId);
    const merged = Math.max(prev, next);
    window.localStorage.setItem(storageKey(projectId), String(merged));
    return merged;
  } catch {
    return next;
  }
}
