"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { CoachRevealText } from "@/components/stage/motion/CoachRevealText";
import { GuidePlaybackFrame } from "@/components/stage/motion/GuidePlaybackFrame";
import { ThinkingDots } from "@/components/stage/motion/ThinkingDots";
import { useGuidePlayback, type GuidePlaybackStep } from "@/hooks/useGuidePlayback";
import { MOTION } from "@/lib/motion/timings";
import { stageBody } from "@/lib/stages/ui";

const THINKING_HOLD_MS = MOTION.coachTypingMs;

const STEPS: GuidePlaybackStep[] = [
  { id: "thinking", holdMs: THINKING_HOLD_MS },
  { id: "writing" },
];

interface StageGuideTextExampleProps {
  content: string;
}

/**
 * 비주얼 보드 예시가 없는 단계용 — Kevin이 실제로 예시 문장을 채우는 모습을
 * "분석 중 → 타이핑" 흐름으로 재현해요. 신규 데이터 없이 기존 example.content를 그대로 재생해요.
 */
export function StageGuideTextExample({ content }: StageGuideTextExampleProps) {
  const playback = useGuidePlayback({ steps: STEPS });
  const isThinking = playback.stepId === "thinking";
  const isWriting = playback.stepId === "writing";

  return (
    <GuidePlaybackFrame
      isComplete={playback.isComplete}
      reducedMotion={playback.reducedMotion}
      onReplay={playback.replay}
    >
      <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-gold/35 bg-highlight px-4 py-3.5">
        {isThinking ? (
          <div className="flex items-center justify-center py-1" aria-hidden>
            <ThinkingDots />
          </div>
        ) : (
          <p className={`${stageBody} break-keep`}>
            {isWriting ? (
              <CoachRevealText text={content} onComplete={playback.advance} />
            ) : (
              <LocalizedText>{content}</LocalizedText>
            )}
          </p>
        )}
      </div>
    </GuidePlaybackFrame>
  );
}
