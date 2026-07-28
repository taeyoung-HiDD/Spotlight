"use client";

import { IconArrowDown, IconArrowRight } from "@tabler/icons-react";
import { useMemo } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { CoachRevealText } from "@/components/stage/motion/CoachRevealText";
import { GuidePlaybackFrame } from "@/components/stage/motion/GuidePlaybackFrame";
import { ThinkingDots } from "@/components/stage/motion/ThinkingDots";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { useGuidePlayback, type GuidePlaybackStep } from "@/hooks/useGuidePlayback";
import { MOTION, MOTION_SPEED_FACTOR } from "@/lib/motion/timings";
import { POSTIT_SHELL_WIDTH_HMW_PAIR } from "@/lib/stages/stage4/postitLayout";
import type { StageGuideVisualExample } from "@/lib/stages/stageActivityGuides";
import { stageCaption } from "@/lib/stages/ui";

const REVEAL_HOLD_MS = MOTION.stageRevealMs;
const THINKING_HOLD_MS = MOTION.coachTypingMs;

const STEPS: GuidePlaybackStep[] = [
  { id: "reveal", holdMs: REVEAL_HOLD_MS },
  { id: "thinking", holdMs: THINKING_HOLD_MS },
  { id: "writing" },
];

interface StageGuideHmwExampleProps {
  visual: Extract<StageGuideVisualExample, { type: "hmw_board" }>;
}

export function StageGuideHmwExample({ visual }: StageGuideHmwExampleProps) {
  const subject = useMemo(
    () => ({
      id: "guide-hmw-subject",
      name: visual.subjectName,
      context: "",
      thumbnailUrl: "",
    }),
    [visual.subjectName],
  );

  const playback = useGuidePlayback({ steps: STEPS });
  const isThinking = playback.stepId === "thinking";
  const isWriting = playback.stepId === "writing";
  const showHmwText = isWriting || playback.isComplete;

  return (
    <GuidePlaybackFrame
      isComplete={playback.isComplete}
      reducedMotion={playback.reducedMotion}
      onReplay={playback.replay}
    >
      <div className="hmw-board rounded-2xl border border-border-warm/70 bg-cream/40 p-3 sm:p-4">
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className={POSTIT_SHELL_WIDTH_HMW_PAIR}>
            <p className={`mb-2 ${stageCaption}`}>잠재 니즈 - 1</p>
            <div className="source-latent-pair__paper-slot aspect-square w-full">
              <div className="source-latent-pair__paper synthesis-postit-paper synthesis-postit-paper--latent_need relative">
                <div className="absolute bottom-[13px] right-[13px] z-[1]">
                  <SubjectInitialBadge
                    subject={subject}
                    subjectIndex={0}
                    size="sm"
                  />
                </div>
                <p className="synthesis-postit-text whitespace-pre-wrap break-keep">
                  {visual.latentNeedText}
                </p>
              </div>
            </div>
          </div>

          <div
            className="flex shrink-0 flex-col items-center justify-center gap-1.5 self-center py-1 sm:px-1 sm:pt-7"
            aria-label="HMW 질문으로 변환"
          >
            <IconArrowDown
              className={`size-5 text-gold sm:hidden ${isThinking ? "coach-phase-pulse" : ""}`}
              style={isThinking ? { animation: "coach-phase-pulse 1s ease-in-out infinite" } : undefined}
              stroke={2}
              aria-hidden
            />
            <IconArrowRight
              className={`hidden size-5 text-gold sm:block ${isThinking ? "coach-phase-pulse" : ""}`}
              style={isThinking ? { animation: "coach-phase-pulse 1s ease-in-out infinite" } : undefined}
              stroke={2}
              aria-hidden
            />
            {isThinking ? <ThinkingDots /> : null}
          </div>

          <div className={POSTIT_SHELL_WIDTH_HMW_PAIR}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className={stageCaption}>HMW 질문 - 1</p>
            </div>
            <div className="hmw-question__paper-slot aspect-square w-full">
              <div className="source-latent-pair__paper synthesis-postit-paper synthesis-postit-paper--hmw">
                {showHmwText ? (
                  <p className="synthesis-postit-text whitespace-pre-wrap break-keep">
                    {isWriting ? (
                      <CoachRevealText
                        text={visual.hmwText}
                        onComplete={playback.advance}
                      />
                    ) : (
                      <LocalizedText>{visual.hmwText}</LocalizedText>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GuidePlaybackFrame>
  );
}
