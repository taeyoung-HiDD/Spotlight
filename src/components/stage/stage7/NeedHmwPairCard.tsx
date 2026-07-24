"use client";

import { IconArrowDown, IconArrowRight } from "@tabler/icons-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
import { HmwQualityTipsPanel } from "@/components/stage/stage7/HmwQualityTipsPanel";
import { HmwQuestionSquareField } from "@/components/stage/stage7/HmwQuestionSquareField";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { useUiLocale } from "@/hooks/useUiLocale";
import { POSTIT_SHELL_WIDTH_HMW_PAIR } from "@/lib/stages/stage4/postitLayout";
import type { Stage5SubjectRef } from "@/lib/stages/stage5/latentNeedsTypes";
import type { HmwQuestion } from "@/lib/stages/stage7/hmwTypes";
import { isManualHmwQuestion } from "@/lib/stages/stage7/hmwTypes";
import { stageCaption } from "@/lib/stages/ui";

interface NeedHmwPairCardProps {
  question: HmwQuestion;
  subject: Stage5SubjectRef;
  subjectIndex: number;
  /** 1-based 페어 번호 (잠재 니즈·HMW 동일) */
  pairIndex: number;
  onUpdateHmw: (text: string) => void;
  onUpdateLatentNeed?: (text: string) => void;
}

function HmwConvertArrow({ label }: { label: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center self-center py-1 sm:px-1 sm:pt-7"
      aria-label={label}
      title={label}
    >
      <IconArrowDown
        className="size-5 text-gold sm:hidden"
        stroke={2}
        aria-hidden
      />
      <IconArrowRight
        className="hidden size-5 text-gold sm:block"
        stroke={2}
        aria-hidden
      />
    </div>
  );
}

export function NeedHmwPairCard({
  question,
  subject,
  subjectIndex,
  pairIndex,
  onUpdateHmw,
  onUpdateLatentNeed,
}: NeedHmwPairCardProps) {
  const manualNeed = isManualHmwQuestion(question);
  const locale = useUiLocale();
  const arrowLabel =
    locale === "en" ? "Convert to HMW question" : "HMW 질문으로 변환";

  return (
    <article className="hmw-board min-w-0 rounded-2xl border border-border-warm/70 bg-cream/40 p-3 sm:p-4">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className={POSTIT_SHELL_WIDTH_HMW_PAIR}>
          <p className={`mb-2 ${stageCaption}`}>
            {locale === "en"
              ? `Latent need - ${pairIndex}`
              : `잠재 니즈 - ${pairIndex}`}
          </p>
          <div className="source-latent-pair__paper-slot aspect-square w-full">
            <div className="source-latent-pair__paper synthesis-postit-paper synthesis-postit-paper--latent_need relative">
              {!manualNeed ? (
                <div className="absolute bottom-[13px] right-[13px] z-[1]">
                  <SubjectInitialBadge
                    subject={subject}
                    subjectIndex={subjectIndex}
                    size="sm"
                  />
                </div>
              ) : null}
              {manualNeed && onUpdateLatentNeed ? (
                <SynthesisPostitTextarea
                  value={question.latentNeedText}
                  onChange={onUpdateLatentNeed}
                  placeholder={
                    locale === "en"
                      ? "Write a latent need"
                      : "잠재 니즈를 적어 주세요"
                  }
                  autoFit={false}
                />
              ) : (
                <p className="synthesis-postit-text whitespace-pre-wrap break-keep text-foreground">
                  <LocalizedText>{question.latentNeedText}</LocalizedText>
                </p>
              )}
            </div>
          </div>
        </div>

        <HmwConvertArrow label={arrowLabel} />

        <HmwQuestionSquareField
          value={question.hmwText}
          onChange={onUpdateHmw}
          pairIndex={pairIndex}
        />
      </div>

      <HmwQualityTipsPanel
        tips={question.qualityTips}
        variationKind={question.variationKind}
      />
    </article>
  );
}
