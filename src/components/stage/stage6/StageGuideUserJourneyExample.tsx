"use client";

import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { JourneyEmotionCurve } from "@/components/stage/stage6/JourneyEmotionCurve";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { useUiLocale } from "@/hooks/useUiLocale";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import type {
  StageGuideUserJourneyItemExample,
  StageGuideUserJourneyStepExample,
  StageGuideVisualExample,
} from "@/lib/stages/stageActivityGuides";
import {
  JOURNEY_BOARD_PLACEHOLDERS,
  JOURNEY_BOARD_ROW_LABELS,
} from "@/lib/stages/stage6/userJourneyBoardLabels";
import { buildJourneyEmotionPoints } from "@/lib/stages/stage6/journeyEmotionFromPain";
import { emptyJourneyZoneItems } from "@/lib/stages/stage6/journeyStepZones";
import {
  journeyStepHeaderClass,
  type JourneyMapItem,
  type JourneyMapItemKind,
  type JourneyMapStep,
} from "@/lib/stages/stage6/userJourneyTypes";
import type { Stage5SubjectRef } from "@/lib/stages/stage5/latentNeedsTypes";
import { stageCaption, stageLabel } from "@/lib/stages/ui";

const KIND_CHIP: Record<
  Exclude<JourneyMapItemKind, "latent_need">,
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
};

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
  return items
    .filter((item) => item.kind === "quote" || item.kind === "observation")
    .map((item, index) => ({
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
  const locale = useUiLocale();
  if (item.kind === "latent_need") return null;
  const meta = KIND_CHIP[item.kind];
  const label =
    locale === "en"
      ? item.kind === "quote"
        ? "Quote"
        : "Observe"
      : meta.label;
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
        <span className="text-[10px] font-bold opacity-70">{label}</span>
      </div>
      <LocalizedText>{item.text}</LocalizedText>
    </div>
  );
}

function GuideJourneyRowLabels() {
  return (
    <div
      className="user-journey-board__row-labels flex w-[5.5rem] shrink-0 flex-col"
      aria-hidden
    >
      <div className="flex min-h-[4.5rem] items-start border-b border-border-warm/60 pb-2 pr-2 pt-2">
        <div className="text-left break-keep">
          <p className={`${stageLabel} user-journey-board__row-label`}>
            {JOURNEY_BOARD_ROW_LABELS.step}
          </p>
          <p className="mt-0.5 text-[10px] user-journey-board__row-label-hint">
            {JOURNEY_BOARD_ROW_LABELS.stepHint}
          </p>
        </div>
      </div>
      <div className="flex min-h-[7rem] items-start border-b border-border-warm/60 py-2.5 pr-2">
        <div className="text-left break-keep">
          <p className={`${stageLabel} user-journey-board__row-label`}>
            {JOURNEY_BOARD_ROW_LABELS.behavior}
          </p>
          <p className="mt-0.5 text-[10px] user-journey-board__row-label-hint">
            {JOURNEY_BOARD_ROW_LABELS.behaviorHint}
          </p>
        </div>
      </div>
      <div className="flex min-h-[7rem] items-start py-2.5 pr-2">
        <div className="text-left break-keep">
          <p className={`${stageLabel} user-journey-board__row-label`}>
            {JOURNEY_BOARD_ROW_LABELS.pain_point}
          </p>
          <p className="mt-0.5 text-[10px] user-journey-board__row-label-hint">
            {JOURNEY_BOARD_ROW_LABELS.pain_pointHint}
          </p>
        </div>
      </div>
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
  const behavior = toJourneyItems(
    step.items,
    "guide-active",
    `guide-step-${stepIndex}`,
  );
  const painPointText = step.painPointText?.trim() ?? "";

  return (
    <div className="flex w-[10.5rem] shrink-0 flex-col overflow-hidden rounded-lg border border-border-warm bg-panel">
      <div
        className={`${journeyStepHeaderClass(stepIndex)} user-journey-board__step-header flex min-h-[4.5rem] items-center justify-center border-b border-border-warm/60 px-2 py-2.5 text-center`}
      >
        <p className="w-full px-1 text-[16px] font-semibold leading-snug text-foreground break-keep">
          {step.label}
        </p>
      </div>
      <div className="user-journey-board__zone user-journey-board__zone--behavior min-h-[7rem] space-y-1.5 border-b border-border-warm/60 p-2">
        {behavior.length > 0 ? (
          behavior.map((item, itemIndex) => (
            <GuideItemChip key={item.id} item={item} index={itemIndex} />
          ))
        ) : (
          <p className="user-journey-board__zone-placeholder px-1 py-5 break-keep">
            {JOURNEY_BOARD_PLACEHOLDERS.behaviorDrop}
          </p>
        )}
      </div>
      <div className="user-journey-board__zone user-journey-board__zone--pain_point min-h-[7rem] space-y-1.5 p-2">
        {painPointText ? (
          <p className="rounded-md border border-[#EF5350]/35 bg-[#FFEBEE]/90 px-2 py-1.5 text-[12px] font-semibold leading-snug text-[#1c1a16] break-keep">
            <LocalizedText>{painPointText}</LocalizedText>
          </p>
        ) : (
          <p className="user-journey-board__zone-placeholder px-1 py-5 break-keep">
            {JOURNEY_BOARD_PLACEHOLDERS.pain_pointDrop}
          </p>
        )}
      </div>
    </div>
  );
}

function guideStepsToEmotionPoints(
  steps: StageGuideUserJourneyStepExample[],
) {
  const journeySteps: JourneyMapStep[] = steps.map((step, index) => ({
    id: `guide-emotion-${index}`,
    label: step.label,
    order: index,
    zoneItems: emptyJourneyZoneItems(),
    aiTexts: step.painPointText?.trim()
      ? { pain_point: [step.painPointText.trim()] }
      : {},
  }));
  return buildJourneyEmotionPoints(journeySteps, {});
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
        {(["quote", "observation"] as const).map((kind) => {
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
        <span className="text-[12px] text-muted break-keep">· 예시 데이터</span>
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
            <p
              className={`rounded-lg border border-border-warm bg-cream/40 px-2.5 py-2 text-[12px] leading-relaxed text-foreground break-keep`}
            >
              {visual.expectations}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto p-2.5 sm:p-3">
          <div className="flex min-w-max flex-col gap-0">
            <div className="flex items-stretch gap-2">
              <GuideJourneyRowLabels />
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
            <div className="mt-0 flex items-stretch gap-2">
              <div
                className="user-journey-board__row-labels flex w-[5.5rem] shrink-0 items-start py-2.5 pr-2"
                aria-hidden
              >
                <div className="text-left break-keep">
                  <p className={`${stageLabel} user-journey-board__row-label`}>
                    {JOURNEY_BOARD_ROW_LABELS.feeling}
                  </p>
                  <p className="mt-0.5 text-[10px] user-journey-board__row-label-hint">
                    {JOURNEY_BOARD_ROW_LABELS.feelingHint}
                  </p>
                </div>
              </div>
              <div
                className="user-journey-board__zone user-journey-board__zone--feeling min-w-0 shrink-0 overflow-hidden rounded-b-lg border border-border-warm"
                style={{
                  width: `calc(${visual.steps.length} * 10.5rem + ${Math.max(0, visual.steps.length - 1)} * 0.5rem)`,
                }}
              >
                <JourneyEmotionCurve
                  points={guideStepsToEmotionPoints(visual.steps)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border-warm bg-cream/30 px-3 py-3">
        <p className={`mb-1 ${stageLabel}`}>
          {personaLabel} · 배치 전 조사 카드
        </p>
        <p className={`mb-2 ${stageCaption} break-keep`}>
          아직 여정 단계에 놓지 않은 언급·관찰 카드는 아래 풀에 남아 있어요.
        </p>
        {poolItems.length > 0 ? (
          <div>
            <p className={`mb-1.5 ${stageLabel}`}>
              {JOURNEY_BOARD_PLACEHOLDERS.poolBehavior}
            </p>
            <div className="flex flex-wrap gap-2">
              {poolItems.map((item) => (
                <GuideItemChip key={item.id} item={item} />
              ))}
            </div>
          </div>
        ) : (
          <p className={stageCaption}>배치할 항목이 없어요.</p>
        )}
      </div>
    </div>
  );
}
