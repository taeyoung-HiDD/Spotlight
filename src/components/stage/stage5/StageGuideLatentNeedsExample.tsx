"use client";

import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import { useMemo, type ReactNode } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { CoachRevealText } from "@/components/stage/motion/CoachRevealText";
import { GuidePlaybackFrame } from "@/components/stage/motion/GuidePlaybackFrame";
import { ThinkingDots } from "@/components/stage/motion/ThinkingDots";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { useGuidePlayback, type GuidePlaybackStep } from "@/hooks/useGuidePlayback";
import { useUiLocale } from "@/hooks/useUiLocale";
import { MOTION, MOTION_SPEED_FACTOR } from "@/lib/motion/timings";
import { POSTIT_SHELL_WIDTH_STAGE5 } from "@/lib/stages/stage4/postitLayout";
import type {
  StageGuideLatentNeedsPairExample,
  StageGuideVisualExample,
} from "@/lib/stages/stageActivityGuides";
import type {
  Stage5BoardPostitKind,
  Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";

const SOURCE_KIND_LABEL = {
  quote: { ko: "언급한 것", en: "Quoted" },
  observation: { ko: "관찰한 것", en: "Observed" },
} as const;

/** 언급·관찰 포스트잇이 먼저 자리 잡는 시간 */
const SOURCE_HOLD_MS = MOTION.stageRevealMs;
/** "분석 중" 표시를 유지하는 시간 */
const THINKING_HOLD_MS = MOTION.coachTypingMs;
/** 잠재 니즈 문장이 다 채워진 뒤 다음 대상으로 넘어가기 전 읽는 시간 */
const READ_PAUSE_MS = Math.round(1200 * MOTION_SPEED_FACTOR);
/** 마지막에 "잠재 니즈 추가" 버튼을 강조하는 시간 */
const ADD_HINT_HOLD_MS = Math.round(1800 * MOTION_SPEED_FACTOR);

type PairPhase = "hidden" | "source" | "thinking" | "writing" | "done";

function demoSubject(name: string, index: number): Stage5SubjectRef {
  return {
    id: `guide-subject-${index}`,
    name,
    context: "",
    thumbnailUrl: "",
  };
}

function GuidePostitPaper({
  kind,
  subject,
  subjectIndex,
  children,
}: {
  kind: Stage5BoardPostitKind;
  subject: Stage5SubjectRef;
  subjectIndex: number;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "source-latent-pair__paper synthesis-postit-paper",
        `synthesis-postit-paper--${kind}`,
      ].join(" ")}
    >
      <div className="absolute bottom-[13px] right-[13px] z-[1]">
        <SubjectInitialBadge
          subject={subject}
          subjectIndex={subjectIndex}
          size="sm"
          showTooltip={false}
        />
      </div>
      {children}
    </div>
  );
}

function ThinkingSlot({ active }: { active: boolean }) {
  return (
    <div
      className="flex aspect-square w-full items-center justify-center rounded-[10px] border border-dashed border-border-warm bg-cream/40"
      aria-hidden
    >
      {active ? <ThinkingDots /> : null}
    </div>
  );
}

function GuidePairCard({
  pair,
  subjectIndex,
  phase,
  onLatentTyped,
}: {
  pair: StageGuideLatentNeedsPairExample;
  subjectIndex: number;
  phase: PairPhase;
  onLatentTyped: () => void;
}) {
  const locale = useUiLocale();
  const subject = demoSubject(pair.subjectName, subjectIndex);
  const sourceLabel = SOURCE_KIND_LABEL[pair.sourceKind][locale];

  if (phase === "hidden") return null;

  const showLatentText = phase === "writing" || phase === "done";

  return (
    <div
      className={`${POSTIT_SHELL_WIDTH_STAGE5} shrink-0 source-latent-pair coach-message-in pointer-events-none select-none`}
      style={{ animation: "coach-message-in 0.42s ease-out both" }}
      aria-hidden
    >
      <div className="source-latent-pair__frame flex flex-col gap-2">
        <span className="source-latent-pair__kind latent-needs-board__kind-label text-[11px] font-semibold">
          {sourceLabel}
        </span>

        <div className="source-latent-pair__paper-slot aspect-square w-full">
          <GuidePostitPaper
            kind={pair.sourceKind}
            subject={subject}
            subjectIndex={subjectIndex}
          >
            <p className="synthesis-postit-text break-keep">
              <LocalizedText>{pair.sourceText}</LocalizedText>
            </p>
          </GuidePostitPaper>
        </div>

        {!showLatentText ? (
          <ThinkingSlot active={phase === "thinking"} />
        ) : pair.expanded ? (
          <div className="source-latent-pair__latents flex flex-col gap-3">
            <div className="source-latent-pair__paper-slot aspect-square w-full">
              <GuidePostitPaper
                kind="latent_need"
                subject={subject}
                subjectIndex={subjectIndex}
              >
                <p className="synthesis-postit-text break-keep">
                  {phase === "writing" ? (
                    <CoachRevealText
                      text={pair.latentText}
                      onComplete={onLatentTyped}
                    />
                  ) : (
                    <LocalizedText>{pair.latentText}</LocalizedText>
                  )}
                </p>
              </GuidePostitPaper>
            </div>
          </div>
        ) : (
          <div className="source-latent-pair__preview" aria-hidden>
            <span className="source-latent-pair__preview-badge">
              {locale === "en" ? "Latent need" : "잠재 니즈"}
            </span>
            <span className="source-latent-pair__preview-text truncate">
              {phase === "writing" ? (
                <CoachRevealText
                  text={pair.latentText}
                  onComplete={onLatentTyped}
                />
              ) : (
                <LocalizedText>{pair.latentText}</LocalizedText>
              )}
            </span>
            <IconChevronDown
              className="source-latent-pair__preview-icon size-3.5 shrink-0"
              stroke={2.5}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface StageGuideLatentNeedsExampleProps {
  visual: Extract<StageGuideVisualExample, { type: "latent_needs_board" }>;
}

export function StageGuideLatentNeedsExample({
  visual,
}: StageGuideLatentNeedsExampleProps) {
  const locale = useUiLocale();

  const pairStepIds = useMemo(
    () =>
      visual.pairs.map((_, i) => ({
        source: `source-${i}`,
        thinking: `thinking-${i}`,
        writing: `writing-${i}`,
      })),
    [visual.pairs],
  );

  const steps = useMemo<GuidePlaybackStep[]>(() => {
    const list: GuidePlaybackStep[] = [];
    pairStepIds.forEach(({ source, thinking, writing }) => {
      list.push({ id: source, holdMs: SOURCE_HOLD_MS });
      list.push({ id: thinking, holdMs: THINKING_HOLD_MS });
      list.push({ id: writing });
      list.push({ id: `${writing}-settle`, holdMs: READ_PAUSE_MS });
    });
    list.push({ id: "add-hint", holdMs: ADD_HINT_HOLD_MS });
    return list;
  }, [pairStepIds]);

  const playback = useGuidePlayback({ steps });

  const stepIndexOf = useMemo(() => {
    const map = new Map<string, number>();
    steps.forEach((step, i) => map.set(step.id, i));
    return map;
  }, [steps]);

  const pairPhase = (pairIndex: number): PairPhase => {
    const ids = pairStepIds[pairIndex]!;
    const sourceIdx = stepIndexOf.get(ids.source)!;
    const thinkingIdx = stepIndexOf.get(ids.thinking)!;
    const writingIdx = stepIndexOf.get(ids.writing)!;
    const current = playback.stepIndex;
    if (current < sourceIdx) return "hidden";
    if (current === sourceIdx) return "source";
    if (current === thinkingIdx) return "thinking";
    if (current === writingIdx) return "writing";
    return "done";
  };

  const isAddHintActive =
    playback.stepId === "add-hint" && !playback.isComplete;

  return (
    <GuidePlaybackFrame
      isComplete={playback.isComplete}
      reducedMotion={playback.reducedMotion}
      onReplay={playback.replay}
    >
      <div className="latent-needs-board rounded-xl border border-border-warm bg-cream/25 px-3 py-4 sm:px-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(
            ["quote", "observation", "finding", "latent_need"] as const
          ).map((kind) => {
            const meta =
              kind === "quote"
                ? {
                    label: locale === "en" ? "Quoted" : "언급한 것",
                    class:
                      "latent-needs-board__legend latent-needs-board__legend--quote",
                  }
                : kind === "observation"
                  ? {
                      label: locale === "en" ? "Observed" : "관찰한 것",
                      class:
                        "latent-needs-board__legend latent-needs-board__legend--observation",
                    }
                  : kind === "finding"
                    ? {
                        label: locale === "en" ? "Finding" : "발견한 것",
                        class:
                          "latent-needs-board__legend latent-needs-board__legend--finding",
                      }
                    : {
                        label: locale === "en" ? "Latent need" : "잠재 니즈",
                        class:
                          "latent-needs-board__legend latent-needs-board__legend--latent",
                      };
            return (
              <span
                key={kind}
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[12px] font-medium ${meta.class}`}
              >
                {meta.label}
              </span>
            );
          })}
        </div>

        <div className="flex min-h-[11rem] flex-wrap items-start justify-center gap-4 sm:justify-start">
          {visual.pairs.map((pair, index) => (
            <GuidePairCard
              key={`${pair.sourceKind}-${index}`}
              pair={pair}
              subjectIndex={index}
              phase={pairPhase(index)}
              onLatentTyped={playback.advance}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div
            className={[
              "source-latent-pair__toggle source-latent-pair__toggle--add inline-flex w-auto shrink-0 px-3 pointer-events-none select-none transition-shadow",
              isAddHintActive ? "coach-phase-pulse ring-2 ring-gold/60" : "",
            ].join(" ")}
            style={
              isAddHintActive
                ? { animation: "coach-phase-pulse 1.1s ease-in-out infinite" }
                : undefined
            }
          >
            <IconPlus className="size-3.5 shrink-0" stroke={2.5} />
            잠재 니즈 추가
          </div>
          <span className="text-[12px] text-muted break-keep">
            직접 보라 포스트잇을 더할 때 보이는 버튼이에요
          </span>
        </div>
      </div>
    </GuidePlaybackFrame>
  );
}
