/**
 * stageConfig 인트로 발화 → 코치 순차 다이얼로그 아이템
 * 문자열 content로 넘겨 EN 모드에서 CoachDialogMessage가 번역 가능하도록 함.
 */
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import type { StageIntroMessage, StageTextPart } from "@/config/stageConfig";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";

function partsToText(parts: StageTextPart[]): string {
  return parts.map((p) => p.text).join("");
}

export function introMessagesToCoachDialog(
  messages: StageIntroMessage[] | undefined,
): CoachDialogItem[] {
  if (!messages?.length) return [];

  return messages.map((message) => {
    const text = formatCoachDialogBreaks(partsToText(message.parts));
    if (message.type === "highlight") {
      return {
        type: "highlight",
        label: message.label,
        content: text,
      };
    }
    return {
      type: "bubble",
      variant: message.variant,
      content: text,
    };
  });
}
