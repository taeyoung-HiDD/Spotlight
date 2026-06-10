import {
  IconBulb,
  IconDeviceMobile,
  IconHeart,
  IconMountain,
  IconRocket,
} from "@tabler/icons-react";
import { STAGE_COUNT } from "@/lib/stages/constants";

/** 컷 9 사이드바 · 세부 단계 표시명 (reference 그대로) */
export type SidebarStageItem = {
  id: number;
  navLabel: string;
  /** 10–15 서비스 확장: 점선 외곽 */
  isServiceExtension: boolean;
};

export type SidebarMacroGroup = {
  id: string;
  label: string;
  icon: typeof IconHeart;
  stages: SidebarStageItem[];
};

export const SIDEBAR_MACRO_GROUPS: SidebarMacroGroup[] = [
  {
    id: "empathize",
    label: "공감하기",
    icon: IconHeart,
    stages: [
      { id: 1, navLabel: "문제점 찾기", isServiceExtension: false },
      { id: 2, navLabel: "맥락 이해하기", isServiceExtension: false },
      { id: 3, navLabel: "사용자 조사 준비하기", isServiceExtension: false },
    ],
  },
  {
    id: "analyze",
    label: "발견 정리하기",
    icon: IconMountain,
    stages: [
      { id: 4, navLabel: "발견 정리하기", isServiceExtension: false },
      { id: 5, navLabel: "진짜 필요 찾기", isServiceExtension: false },
      { id: 6, navLabel: "사용자 여정 지도 그리기", isServiceExtension: false },
    ],
  },
  {
    id: "ideate",
    label: "아이디어 만들기",
    icon: IconBulb,
    stages: [
      { id: 7, navLabel: "아이디어 만들기", isServiceExtension: false },
      { id: 8, navLabel: "우선순위 정하기", isServiceExtension: false },
      { id: 9, navLabel: "컨셉 정리하기", isServiceExtension: false },
    ],
  },
  {
    id: "prototype",
    label: "시제품 만들기",
    icon: IconDeviceMobile,
    stages: [{ id: 10, navLabel: "시제품 만들기", isServiceExtension: true }],
  },
  {
    id: "business",
    label: "사업화 검토",
    icon: IconRocket,
    stages: [
      { id: 11, navLabel: "테스트로 검증", isServiceExtension: true },
      { id: 12, navLabel: "사업 타당성", isServiceExtension: true },
      { id: 13, navLabel: "90일 로드맵", isServiceExtension: true },
      { id: 14, navLabel: "사업 제안서", isServiceExtension: true },
      { id: 15, navLabel: "투자·지원 연결", isServiceExtension: true },
    ],
  },
];

export function getSidebarStage(id: number): SidebarStageItem | undefined {
  for (const group of SIDEBAR_MACRO_GROUPS) {
    const found = group.stages.find((s) => s.id === id);
    if (found) return found;
  }
  return undefined;
}

export type MacroGroupStatus = "complete" | "in_progress" | "upcoming";

export function getMacroGroupStatus(
  stageIds: number[],
  currentStage: number,
  completedStages: number[],
  maxReachedStage: number = currentStage,
): MacroGroupStatus {
  const allDone = stageIds.every((id) => completedStages.includes(id));
  if (allDone) return "complete";
  if (stageIds.includes(currentStage)) return "in_progress";
  if (stageIds.some((id) => completedStages.includes(id))) return "in_progress";
  const maxId = Math.max(...stageIds);
  const minStage = Math.min(...stageIds);
  if (maxReachedStage > maxId) return "complete";
  if (currentStage > maxId) return "complete";
  if (maxReachedStage >= minStage) return "in_progress";
  if (currentStage >= minStage) return "in_progress";
  return "upcoming";
}

export function macroStatusSuffix(status: MacroGroupStatus): string {
  if (status === "complete") return " · 완료";
  if (status === "in_progress") return " · 진행";
  return "";
}

export { STAGE_COUNT };
