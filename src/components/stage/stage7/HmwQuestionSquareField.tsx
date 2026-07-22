"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
import { useUiLocale } from "@/hooks/useUiLocale";
import { POSTIT_SHELL_WIDTH_HMW_PAIR } from "@/lib/stages/stage4/postitLayout";
import { stageCaption } from "@/lib/stages/ui";

interface HmwQuestionSquareFieldProps {
  value: string;
  onChange?: (text: string) => void;
  readOnly?: boolean;
  kevinGenerated?: boolean;
}

export function HmwQuestionSquareField({
  value,
  onChange,
  readOnly = false,
  kevinGenerated = false,
}: HmwQuestionSquareFieldProps) {
  const locale = useUiLocale();

  return (
    <div className={POSTIT_SHELL_WIDTH_HMW_PAIR}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className={stageCaption}>
          {locale === "en" ? "HMW question" : "HMW 질문"}
        </p>
        {kevinGenerated ? (
          <span className="rounded-md bg-highlight px-2 py-0.5 text-[11px] font-medium text-gold">
            {locale === "en" ? "Kevin draft" : "Kevin 초안"}
          </span>
        ) : null}
      </div>
      <div className="hmw-question__paper-slot aspect-square w-full">
        <div className="source-latent-pair__paper synthesis-postit-paper synthesis-postit-paper--hmw">
          {readOnly ? (
            <p className="synthesis-postit-text whitespace-pre-wrap break-keep text-[13px] leading-relaxed">
              <LocalizedText>{value}</LocalizedText>
            </p>
          ) : (
            <SynthesisPostitTextarea
              value={value}
              onChange={onChange ?? (() => {})}
              placeholder={
                locale === "en"
                  ? "How might we … in order to …?"
                  : "어떻게 하면 …하기 위해 …할 수 있을까?"
              }
              autoFit={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
