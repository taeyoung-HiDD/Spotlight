"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
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
  onUpdateHmw: (text: string) => void;
  onUpdateLatentNeed?: (text: string) => void;
}

export function NeedHmwPairCard({
  question,
  subject,
  subjectIndex,
  onUpdateHmw,
  onUpdateLatentNeed,
}: NeedHmwPairCardProps) {
  const manualNeed = isManualHmwQuestion(question);
  const locale = useUiLocale();

  return (
    <article className="hmw-board rounded-2xl border border-border-warm/70 bg-cream/40 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className={POSTIT_SHELL_WIDTH_HMW_PAIR}>
          <p className={`mb-2 ${stageCaption}`}>
            {locale === "en" ? "Latent need" : "잠재 니즈"}
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
                  className="synthesis-postit-text min-h-[7rem] text-[13px]"
                />
              ) : (
                <p className="synthesis-postit-text whitespace-pre-wrap break-keep text-[13px] leading-relaxed text-foreground">
                  <LocalizedText>{question.latentNeedText}</LocalizedText>
                </p>
              )}
            </div>
          </div>
        </div>

        <HmwQuestionSquareField
          value={question.hmwText}
          onChange={onUpdateHmw}
          kevinGenerated={question.kevinGenerated}
        />
      </div>
    </article>
  );
}
