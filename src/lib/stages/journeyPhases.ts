/** 사용자에게 안내하는 압축 여정 (세부 15단계를 6개 흐름으로 설명) */
export const JOURNEY_PHASES = [
  "공감하기",
  "분석하기",
  "아이디어 내기",
  "시제품 만들기",
  "사업 검토하기",
  "사업 제안하기",
] as const;

export type JourneyPhase = (typeof JOURNEY_PHASES)[number];

export type JourneyPhaseGroup = {
  label: JourneyPhase;
  stages: readonly number[];
};

/** 6개 매크로 흐름 ↔ 세부 단계 1–16 */
export const JOURNEY_PHASE_GROUPS: readonly JourneyPhaseGroup[] = [
  { label: "공감하기", stages: [1, 2, 3] },
  { label: "분석하기", stages: [4, 5, 6] },
  { label: "아이디어 내기", stages: [7, 8, 9, 10] },
  { label: "시제품 만들기", stages: [11] },
  { label: "사업 검토하기", stages: [12, 13, 14] },
  { label: "사업 제안하기", stages: [15, 16] },
] as const;

export function formatJourneyPhases(separator = " → "): string {
  return JOURNEY_PHASES.join(separator);
}

export function getJourneyPhaseForStage(stage: number): JourneyPhase | undefined {
  return JOURNEY_PHASE_GROUPS.find((g) => g.stages.includes(stage))?.label;
}
