import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";

/** 단계 1에서 선택하는 코칭·가이드 방식 */
export type GuidanceStyle = "task_focused" | "full_guidance";

export interface GuidanceStyleOption {
  id: GuidanceStyle;
  title: string;
  subtitle: string;
  bullets: string[];
}

export const GUIDANCE_STYLE_OPTIONS: GuidanceStyleOption[] = [
  {
    id: "task_focused",
    title: "단계별 설명 없이 혼자 조절하는 방식",
    subtitle: "가이드 없이 바로 채움 · 등급만 확인",
    bullets: [
      "단계마다 할 일만 바로 보여줘요",
      "코치는 필요할 때만 짧게 짚어 줘요",
      "가이드 팝업 없이 바로 작업해요",
    ],
  },
  {
    id: "full_guidance",
    title: "예시와 설명을 듣고 따라가는 방식",
    subtitle: "단계 가이드 · 의미·방법·예시까지",
    bullets: [
      "단계마다 왜 하는지·어떻게 하는지 설명해요",
      "코치가 방법과 예시를 충분히 들려줘요",
      "단계 가이드를 먼저 보고 시작해요",
    ],
  },
];

export function userLevelFromGuidanceStyle(
  style: GuidanceStyle,
): UserCoachingLevel {
  return style === "task_focused" ? "expert" : "beginner";
}

/** 단계 1 artifact — 가이드 방식 선택이 userLevel보다 우선 */
export function resolveCoachingLevel(state: {
  userLevel?: UserCoachingLevel;
  guidanceStyle?: GuidanceStyle;
}): UserCoachingLevel | undefined {
  if (state.guidanceStyle) return userLevelFromGuidanceStyle(state.guidanceStyle);
  if (state.userLevel) return state.userLevel;
  return undefined;
}

export function isTaskFocusedCoachingLevel(level: UserCoachingLevel): boolean {
  return level === "expert";
}

/** 가이드 게이트·코치 인트로 — guidanceStyle 우선 판별 */
export function isTaskFocusedProjectState(state: {
  guidanceStyle?: GuidanceStyle;
  userLevel?: UserCoachingLevel;
}): boolean {
  if (state.guidanceStyle === "task_focused") return true;
  if (state.guidanceStyle === "full_guidance") return false;
  const level = state.userLevel ?? resolveCoachingLevel(state);
  return level ? isTaskFocusedCoachingLevel(level) : false;
}

export function guidanceStyleFromUserLevel(
  level: UserCoachingLevel,
): GuidanceStyle {
  return level === "expert" ? "task_focused" : "full_guidance";
}

export function guidanceStyleLabel(style: GuidanceStyle): string {
  return (
    GUIDANCE_STYLE_OPTIONS.find((o) => o.id === style)?.title ?? "가이드 방식"
  );
}

/** 코치 — 각 방식이 어울리는 사람 (선택 전·후 안내) */
export const GUIDANCE_STYLE_SUITABILITY: Record<
  GuidanceStyle,
  { label: string; fits: string[]; selectedLead: string }
> = {
  task_focused: {
    label: "단계별 설명 없이 혼자 조절하는 방식",
    fits: [
      "디자인씽킹·창업 워크숍을 한두 번 이상 경험한 분",
      "단계 설명보다 할 일만 보고 바로 움직이고 싶은 분",
      "혼자 속도를 조절하며 필요할 때만 짚어 받고 싶은 분",
    ],
    selectedLead:
      "익숙하시거나 빠르게 움직이고 싶을 때 잘 맞는 방식이에요.",
  },
  full_guidance: {
    label: "예시와 설명을 듣고 따라가는 방식",
    fits: [
      "디자인씽킹이 처음이거나 단계마다 왜 하는지 배우고 싶은 분",
      "예시와 방법 설명을 듣고 따라가는 게 편한 분",
      "각 단계의 의미를 충분히 이해한 뒤 작업하고 싶은 분",
    ],
    selectedLead:
      "처음이시거나 차근차근 배우며 가고 싶을 때 잘 맞는 방식이에요.",
  },
};
