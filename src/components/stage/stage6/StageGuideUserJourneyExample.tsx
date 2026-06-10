"use client";

import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import type {
  StageGuideUserJourneyItemExample,
  StageGuideUserJourneyStepExample,
  StageGuideVisualExample,
} from "@/lib/stages/stageActivityGuides";
import {
  countJourneyStepItems,
  journeyStepHeaderClass,
  type JourneyMapItem,
  type JourneyMapItemKind,
} from "@/lib/stages/stage6/userJourneyTypes";
import type { Stage5SubjectRef } from "@/lib/stages/stage5/latentNeedsTypes";
import { stageCaption, stageLabel } from "@/lib/stages/ui";

const KIND_CHIP: Record<
  JourneyMapItemKind,
  { label: string; className: string }
> = {
  quote: {
    label: "언급",
    className: "border-[#F9A825]/50 bg-[#FFF9C4]/90 text-[#1c1a16]",
  },
  observation: {
    label: "관찰",
    className: "border-[#FB8C00]/40 bg-[#FFE0B2]/90 text-[#1c1a16]",
  },
  latent_need: {
    label: "잠재 니즈",
    className: "border-[#7E57C2]/40 bg-[#EDE7F6]/95 text-[#1c1a16]",
  },
};

const STEP_COUNT_CHIP = {
  quote: {
    label: "언급",
    className:
      "user-journey-board__step-count--quote border-[#F9A825]/45 bg-[#FFF9C4]/55",
  },
  observation: {
    label: "관찰",
    className:
      "user-journey-board__step-count--observation border-[#FB8C00]/40 bg-[#FFE0B2]/55",
  },
  need: {
    label: "니즈",
    className:
      "user-journey-board__step-count--need border-[#7E57C2]/40 bg-[#EDE7F6]/70",
  },
} as const;

function demoSubject(name: string, index: number): Stage5SubjectRef {
  return {
    id: `guide-journey-subject-${index}`,
    name,
    context: "",
    thumbnailUrl: "",
  };
}

function toJourneyItems(
  items: StageGuideUserJourneyItemExample[],
  subjectId: string,
  prefix: string,
): JourneyMapItem[] {
  return items.map((item, index) => ({
    id: `${prefix}-${index}`,
    kind: item.kind,
    text: item.text,
    subjectId,
  }));
}

function GuideItemChip({
  item,
  index,
}: {
  item: JourneyMapItem;
  index?: number;
}) {
  const meta = KIND_CHIP[item.kind];
  return (
    <div
      className={[
        "rounded-md border px-2 py-1.5 text-[12px] font-semibold leading-snug break-keep",
        meta.className,
      ].join(" ")}
    >
      <div className="mb-0.5 flex items-center gap-1.5">
        {typeof index === "number" ? (
          <span className="text-[10px] font-bold opacity-60">{index + 1}.</span>
        ) : null}
        <span className="text-[10px] font-bold opacity-70">{meta.label}</span>
      </div>
      {item.text}
    </div>
  );
}

function GuideStepInsightCounts({ items }: { items: JourneyMapItem[] }) {
  const counts = countJourneyStepItems(items);

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {(Object.keys(STEP_COUNT_CHIP) as Array<keyof typeof STEP_COUNT_CHIP>).map(
        (key) => {
          const meta = STEP_COUNT_CHIP[key];
          const value =
            key === "quote"
              ? counts.quotes
              : key === "observation"
                ? counts.observations
                : counts.needs;
          return (
            <span
              key={key}
              className={[
                "user-journey-board__step-count inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                meta.className,
              ].join(" ")}
            >
              <span>{meta.label}</span>
              <span className="tabular-nums">{value}</span>
            </span>
          );
        },
      )}
    </div>
  );
}

function GuideJourneyStep({
  step,
  stepIndex,
}: {
  step: StageGuideUserJourneyStepExample;
  stepIndex: number;
}) {
  const stepItems = toJourneyItems(
    step.items,
    "guide-active",
    `guide-step-${stepIndex}`,
  );

  return (
    <div className="flex w-[10.5rem] shrink-0 flex-col overflow-hidden rounded-lg border border-border-warm bg-panel">
      <div
        className={`${journeyStepHeaderClass(stepIndex)} border-b px-2 py-2`}
      >
        <p className="px-1 text-[13px] font-semibold leading-snug text-foreground break-keep">
          {step.label}
        </p>
        <GuideStepInsightCounts items={stepItems} />
      </div>
      <div className="min-h-[7.5rem] flex-1 space-y-1.5 bg-cream/20 p-2">
        {stepItems.length === 0 ? (
          <p className={`px-1 py-5 text-center ${stageCaption}`}>
            아래에서 끌어다 놓기
          </p>
        ) : (
          stepItems.map((item, itemIndex) => (
            <GuideItemChip key={item.id} item={item} index={itemIndex} />
          ))
        )}
      </div>
    </div>
  );
}

interface StageGuideUserJourneyExampleProps {
  visual: Extract<StageGuideVisualExample, { type: "user_journey_map" }>;
}

export function StageGuideUserJourneyExample({
  visual,
}: StageGuideUserJourneyExampleProps) {
  const activeSubject = demoSubject(visual.activeSubjectName, 0);
  const otherSubject = visual.otherSubjectName
    ? demoSubject(visual.otherSubjectName, 1)
    : null;
  const personaLabel = subjectDisplayLabel(visual.activeSubjectName, 0);
  const poolItems = toJourneyItems(
    visual.poolItems,
    activeSubject.id,
    "guide-pool",
  );

  return (
    <div
      className="user-journey-board pointer-events-none select-none space-y-4 rounded-xl border border-border-warm bg-cream/25 px-3 py-4 sm:px-4"
      aria-hidden
    >
      <div className="flex flex-wrap items-center gap-2">
        {(
          ["quote", "observation", "latent_need"] as const
        ).map((kind) => {
          const meta = KIND_CHIP[kind];
          return (
            <span
              key={kind}
              className={[
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[12px] font-medium",
                meta.className,
              ].join(" ")}
            >
              {meta.label}
            </span>
          );
        })}
        <span className="text-[12px] text-muted break-keep">
          · 예시 데이터
        </span>
      </div>

      <div className="rounded-lg border border-border-warm/70 bg-cream/30 px-3 py-2.5">
        <p className={`mb-2.5 ${stageLabel}`}>페르소나</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-2 rounded-md border border-spotlight bg-spotlight px-2.5 py-1.5 text-[14px] font-semibold text-on-spotlight break-keep">
            <SubjectInitialBadge
              subject={activeSubject}
              subjectIndex={0}
              showTooltip={false}
            />
            {personaLabel}
          </span>
          {otherSubject ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-cream px-2.5 py-1.5 text-[14px] font-semibold text-muted break-keep">
              <SubjectInitialBadge
                subject={otherSubject}
                subjectIndex={1}
                showTooltip={false}
              />
              {subjectDisplayLabel(otherSubject.name, 1)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-warm bg-panel">
        <div className="border-b border-border-warm bg-cream/40 px-3 py-2.5 sm:px-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            사용자 여정 지도
          </p>
          <p className="mt-0.5 text-[14px] font-semibold text-foreground break-keep">
            {personaLabel}의 여정
          </p>
        </div>

        <div className="grid gap-0 border-b border-border-warm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-2 border-b border-border-warm p-3 sm:p-4 md:border-b-0 md:border-r">
            <div className="flex min-w-0 items-center gap-2.5">
              <SubjectInitialBadge
                subject={activeSubject}
                subjectIndex={0}
                size="md"
                showTooltip={false}
              />
              <p className="min-w-0 text-[15px] font-semibold text-foreground break-keep">
                {personaLabel}
              </p>
            </div>
            <p className={`${stageCaption} break-keep`}>
              {visual.activeSubjectContext}
            </p>
          </div>
          <div className="p-3 sm:p-4">
            <p className={`mb-1.5 ${stageLabel}`}>기대 사항</p>
            <p className={`rounded-lg border border-border-warm bg-cream/40 px-2.5 py-2 text-[12px] leading-relaxed text-foreground break-keep`}>
              {visual.expectations}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto p-2.5 sm:p-3">
          <div className="flex min-w-max items-stretch gap-2">
            {visual.steps.map((step, index) => (
              <GuideJourneyStep
                key={`${step.label}-${index}`}
                step={step}
                stepIndex={index}
              />
            ))}
            <div className="flex w-[10.5rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-warm bg-cream/20 px-3 py-6 text-muted">
              <span className="text-[12px] font-semibold">+ 단계 추가</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-warm bg-cream/30 px-3 py-3">
        <p className={`mb-1 ${stageLabel}`}>
          {personaLabel} · 배치 전 조사·니즈
        </p>
        <p className={`mb-2 ${stageCaption} break-keep`}>
          아직 여정 단계에 놓지 않은 카드는 아래 풀에 남아 있어요.
        </p>
        {poolItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {poolItems.map((item) => (
              <GuideItemChip key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className={stageCaption}>배치할 항목이 없어요.</p>
        )}
      </div>
    </div>
  );
}
