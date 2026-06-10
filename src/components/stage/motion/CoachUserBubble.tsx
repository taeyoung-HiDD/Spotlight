"use client";

import { stageCoachUserBubble } from "@/lib/stages/ui";

interface CoachUserBubbleProps {
  children: string;
}

export function CoachUserBubble({ children }: CoachUserBubbleProps) {
  return (
    <div className="flex justify-end">
      <p className={stageCoachUserBubble}>{children}</p>
    </div>
  );
}
