import type { ReactNode } from "react";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import type { StageIntroMessage, StageTextPart } from "@/config/stageConfig";
import {
  stageCoachEmphasis,
  stageCoachEmphasisGold,
} from "@/lib/stages/ui";

function emphasisClass(emphasis?: StageTextPart["emphasis"]): string {
  if (emphasis === "gold") return stageCoachEmphasisGold;
  if (emphasis === "strong") return stageCoachEmphasis;
  return "";
}

function renderParts(parts: StageTextPart[]): ReactNode {
  return parts.map((part, index) => {
    const node = part.emphasis ? (
      <span className={emphasisClass(part.emphasis)}>{part.text}</span>
    ) : (
      <span>{part.text}</span>
    );
    const next = parts[index + 1];
    const breakAfter =
      Boolean(next) &&
      /[.?!？…]\s*$/.test(part.text.trim()) &&
      !/^[,.]/.test(next!.text.trim());

    return (
      <span key={index}>
        {node}
        {breakAfter ? (
          <>
            <br />
            <br />
          </>
        ) : null}
      </span>
    );
  });
}

/** stageConfig 인트로 발화 → 코치 순차 다이얼로그 아이템 */
export function introMessagesToCoachDialog(
  messages: StageIntroMessage[] | undefined,
): CoachDialogItem[] {
  if (!messages?.length) return [];

  return messages.map((message) => {
    if (message.type === "highlight") {
      return {
        type: "highlight",
        label: message.label,
        content: renderParts(message.parts),
      };
    }
    return {
      type: "bubble",
      variant: message.variant,
      content: renderParts(message.parts),
    };
  });
}
