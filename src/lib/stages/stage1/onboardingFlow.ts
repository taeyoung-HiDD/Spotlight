import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { DISPLAY_NAME_FALLBACK } from "@/lib/users/displayName";
import {
  GUIDANCE_STYLE_SUITABILITY,
  type GuidanceStyle,
  guidanceStyleLabel,
  userLevelFromGuidanceStyle,
} from "@/lib/stages/stage1/guidanceStyle";
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";

export interface Stage1OnboardingResult {
  displayName: string;
  guidanceStyle: GuidanceStyle;
  userLevel: UserCoachingLevel;
}

function coachName(displayName: string): string {
  return displayName.trim() || DISPLAY_NAME_FALLBACK;
}

function suitabilityList(fits: string[]): string {
  return fits.map((line) => `· ${line}`).join("\n");
}

/** 선택 전 — 두 방식 각각 어울리는 사람 설명 */
export function guidanceStyleKickoffCoachMessages(
  displayName: string,
): CoachDialogItem[] {
  const name = coachName(displayName);
  const task = GUIDANCE_STYLE_SUITABILITY.task_focused;
  const full = GUIDANCE_STYLE_SUITABILITY.full_guidance;

  return [
    {
      type: "bubble",
      variant: "secondary",
      content: formatCoachDialogBreaks(
        `${name}님, 진행 방식을 맞춰 볼게요.\n\n왼쪽에서 두 가지 중 편한 방식을 골라 주세요. 선택한 방식은 이후 모든 단계에 적용돼요.`,
      ),
    },
    {
      type: "highlight",
      label: `${task.label} — 이런 분께`,
      content: formatCoachDialogBreaks(suitabilityList(task.fits)),
    },
    {
      type: "highlight",
      label: `${full.label} — 이런 분께`,
      content: formatCoachDialogBreaks(suitabilityList(full.fits)),
    },
    {
      type: "bubble",
      content:
        "어느 쪽이든 단계를 건너뛰지는 않아요. 편한 쪽을 고르시면 그에 맞춰 코치와 가이드를 조절할게요.",
    },
  ];
}

export function buildOnboardingResult(
  displayName: string,
  guidanceStyle: GuidanceStyle,
): Stage1OnboardingResult {
  return {
    displayName: coachName(displayName),
    guidanceStyle,
    userLevel: userLevelFromGuidanceStyle(guidanceStyle),
  };
}

/** 선택 후 — 맞춤 확인 + 해당 방식 어울리는 사람 */
export function guidanceStyleSelectedCoachMessages(
  result: Stage1OnboardingResult,
): CoachDialogItem[] {
  const name = result.displayName;
  const styleName = guidanceStyleLabel(result.guidanceStyle);
  const suit = GUIDANCE_STYLE_SUITABILITY[result.guidanceStyle];

  return [
    {
      type: "bubble",
      content: formatCoachDialogBreaks(
        `${name}님, 「${styleName}」 방식으로 맞출게요.\n\n${suit.selectedLead}`,
      ),
    },
    {
      type: "highlight",
      label: `${styleName} — 이런 분께 잘 맞아요`,
      content: formatCoachDialogBreaks(suitabilityList(suit.fits)),
    },
    {
      type: "bubble",
      content:
        "왼쪽에서 「프로젝트 이름 정하기」를 누르면 이름을 받은 뒤, 바로 문제·아이디어를 이어서 들을게요.",
    },
  ];
}
