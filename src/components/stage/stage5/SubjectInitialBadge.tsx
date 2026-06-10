"use client";

import {
  subjectDisplayLabel,
  subjectInitials,
} from "@/lib/stages/stage5/subjectInitials";
import type { Stage5SubjectRef } from "@/lib/stages/stage5/latentNeedsTypes";

interface SubjectInitialBadgeProps {
  subject: Stage5SubjectRef;
  subjectIndex: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

/** 기존 sm/md 대비 약 15% 확대 · lg는 md 대비 +20% */
const SIZE_CLASS = {
  sm: "size-[1.725rem] text-[13px]",
  md: "size-[2.0125rem] text-[14px]",
  lg: "size-[2.415rem] text-[16.5px]",
} as const;

export function SubjectInitialBadge({
  subject,
  subjectIndex,
  size = "sm",
  showTooltip = true,
}: SubjectInitialBadgeProps) {
  const label = subjectDisplayLabel(subject.name, subjectIndex);
  const initials = subjectInitials(subject.name, subjectIndex);
  const hasThumb = Boolean(subject.thumbnailUrl?.trim());

  return (
    <span
      className="inline-flex shrink-0 items-center"
      title={showTooltip ? label : undefined}
    >
      {hasThumb ? (
        <img
          src={subject.thumbnailUrl}
          alt=""
          className={[
            "subject-initial-badge__mark rounded-full object-cover",
            SIZE_CLASS[size],
          ].join(" ")}
        />
      ) : (
        <span
          className={[
            "subject-initial-badge__mark inline-flex items-center justify-center rounded-full font-semibold",
            SIZE_CLASS[size],
          ].join(" ")}
          aria-hidden
        >
          {initials}
        </span>
      )}
    </span>
  );
}
