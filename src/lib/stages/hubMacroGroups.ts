import type { MacroGroupStatus } from "@/lib/stages/sidebarNav";

/** 허브·홈 카드 — 4개 상위 매크로 (세부 16단계는 별도 바) */
export type HubMacroGroup = {
  id: string;
  label: string;
  stages: readonly number[];
};

export const HUB_MACRO_GROUPS: readonly HubMacroGroup[] = [
  { id: "empathize", label: "공감하기", stages: [1, 2, 3] },
  { id: "analyze", label: "발견 정리하기", stages: [4, 5, 6] },
  { id: "ideate", label: "아이디어 만들기", stages: [7, 8, 9, 10] },
  { id: "business", label: "사업화 검토하기", stages: [11, 12, 13, 14, 15, 16] },
] as const;

export function getHubMacroGroupForStage(stage: number): HubMacroGroup | undefined {
  const current = Math.round(stage);
  return HUB_MACRO_GROUPS.find((group) => group.stages.includes(current));
}

/** resumeStage만 있을 때 허브 카드용 매크로 상태 */
export function getHubMacroStatus(
  stageIds: readonly number[],
  currentStage: number,
): MacroGroupStatus {
  const current = Math.min(Math.max(1, Math.round(currentStage)), 16);
  const maxId = Math.max(...stageIds);
  const minId = Math.min(...stageIds);
  if (current > maxId) return "complete";
  if (current >= minId) return "in_progress";
  return "upcoming";
}
