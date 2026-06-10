import { IconBulb } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { COACH_DISPLAY_NAME } from "@/lib/coach/constants";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import {
  stageCoachAside,
  stageCoachBubble,
  stageCoachBubbleSecondary,
  stageCoachName,
  stageCoachStatus,
} from "@/lib/stages/ui";

interface CoachPanelProps {
  statusLabel?: string;
  statusSub?: string;
  children: ReactNode;
}

/** 컷 2 · 우측 코치 대화 카드 */
export function CoachPanel({
  statusLabel = "듣는 중",
  statusSub,
  children,
}: CoachPanelProps) {
  return (
    <aside className={stageCoachAside}>
      <div className="mb-3 flex items-center gap-2.5 border-b border-divider pb-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-spotlight">
          <IconBulb className="size-4 text-on-spotlight" stroke={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={stageCoachName}>{COACH_DISPLAY_NAME}</div>
          <div className={stageCoachStatus}>
            {statusSub ? `${statusLabel} · ${statusSub}` : statusLabel}
          </div>
        </div>
        <span
          className="size-2 shrink-0 rounded-full bg-avatar-muted/50"
          aria-hidden
        />
      </div>
      <div className="space-y-2.5">{children}</div>
    </aside>
  );
}

export function CoachBubble({
  children,
  variant = "primary",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <p
      className={
        variant === "primary" ? stageCoachBubble : stageCoachBubbleSecondary
      }
    >
      {typeof children === "string" ? formatCoachDialogBreaks(children) : children}
    </p>
  );
}
