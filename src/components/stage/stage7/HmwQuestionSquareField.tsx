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
  /** 1-based 페어 번호 */
  pairIndex?: number;
}

export function HmwQuestionSquareField({
  value,
  onChange,
  readOnly = false,
  pairIndex,
}: HmwQuestionSquareFieldProps) {
  const locale = useUiLocale();
  const labelBase = locale === "en" ? "HMW question" : "HMW 질문";
  const label =
    pairIndex != null ? `${labelBase} - ${pairIndex}` : labelBase;

  return (
    <div className={POSTIT_SHELL_WIDTH_HMW_PAIR}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className={stageCaption}>{label}</p>
      </div>
      <div className="hmw-question__paper-slot aspect-square w-full">
        <div className="source-latent-pair__paper synthesis-postit-paper synthesis-postit-paper--hmw">
          {readOnly ? (
            <p className="synthesis-postit-text whitespace-pre-wrap break-keep">
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
