"use client";

import {
  CONTEXTUAL_PURPOSE_LABEL,
  CONTEXTUAL_ROLE_LABEL,
  CONTEXTUAL_USAGE_LABEL,
  getContextualPurposeRoleBrief,
  getContextualPurposeUsage,
  getContextualPurposeWhy,
} from "@/lib/stages/stage2/contextualPurposeCopy";
import {
  CONTEXTUAL_RESEARCH_CAPTION,
  CONTEXTUAL_RESEARCH_GUIDELINES,
  CONTEXTUAL_RESEARCH_TITLE,
} from "@/lib/stages/stage2/contextualResearchGuidelines";
import { stageCaption, stageSectionLead } from "@/lib/stages/ui";

interface ContextualPurposeGuideProps {
  startingPoint: string;
  /** 표 위에 한 줄만 (정리 중) */
  compact?: boolean;
}

export function ContextualPurposeGuide({
  startingPoint,
  compact = false,
}: ContextualPurposeGuideProps) {
  if (compact) {
    return (
      <p className={`mb-3 ${stageCaption} break-keep`}>
        사전 리서치 4단계 가이드에 맞춰 자동 조사한 결과예요. To-know·현장
        조사로 이어지고, 보완은 코치 대화로 해 주세요.
      </p>
    );
  }

  const blocks = [
    { label: CONTEXTUAL_PURPOSE_LABEL, body: getContextualPurposeWhy(startingPoint) },
    { label: CONTEXTUAL_ROLE_LABEL, body: getContextualPurposeRoleBrief() },
    { label: CONTEXTUAL_USAGE_LABEL, body: getContextualPurposeUsage() },
  ];

  return (
    <div className="mb-4 space-y-4 break-keep">
      <div className="rounded-xl border border-border-warm bg-surface/50 px-4 py-3.5">
        <p className="text-[17px] font-semibold text-foreground">
          {CONTEXTUAL_RESEARCH_TITLE}
        </p>
        <p className={`mt-1 ${stageSectionLead}`}>{CONTEXTUAL_RESEARCH_CAPTION}</p>
        <ol className="mt-4 space-y-3">
          {CONTEXTUAL_RESEARCH_GUIDELINES.map((g) => (
            <li
              key={g.id}
              className="flex gap-3 rounded-lg border border-border-warm bg-panel px-3 py-2.5"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-spotlight/15 text-[15px] font-bold text-gold"
                aria-hidden
              >
                {g.order}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">
                  {g.title}
                  {g.badge ? (
                    <span className="ml-1.5 text-[13px] font-medium text-muted">
                      + {g.badge}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted">
                  {g.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-border-warm bg-surface/50 px-4 py-3.5">
        <p className={stageSectionLead}>
          실제 리서치 전 사전 파악 — 왜 필요한지, 무엇을 만들고, 다음에 어떻게
          쓰이는지
        </p>
        <ul className="mt-3 space-y-3 text-[16px] leading-relaxed text-foreground">
          {blocks.map((b) => (
            <li key={b.label}>
              <span className="font-semibold text-foreground">{b.label}</span>
              <p className="mt-1 whitespace-pre-wrap text-muted">{b.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
