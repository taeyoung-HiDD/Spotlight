"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { useT } from "@/hooks/useT";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import {
  stageCoachGuideChip,
  stageCoachGuideChipSelected,
  stageCoachGuideHint,
  stageCoachGuidePanel,
  stageCoachGuideTitle,
} from "@/lib/stages/ui";

interface CoachInputGuideProps {
  guide: CoachInputGuide;
  onPickExample: (example: string) => void;
  disabled?: boolean;
  examplesReferenceOnly?: boolean;
  selectedExamples?: string[];
  onToggleExample?: (example: string) => void;
}

/** 코치 입력 대기 시 예시 칩 — 전역 공통 */
export function CoachInputGuidePanel({
  guide,
  onPickExample,
  disabled,
  examplesReferenceOnly = false,
  selectedExamples = [],
  onToggleExample,
}: CoachInputGuideProps) {
  const t = useT();
  if (!guide.examples.length) return null;

  const multiSelect = Boolean(guide.examplesMultiSelect && onToggleExample);

  return (
    <div className={stageCoachGuidePanel} role="region" aria-label={guide.title}>
      <div className={stageCoachGuideTitle}>
        <LocalizedText>{guide.title}</LocalizedText>
      </div>
      {guide.hint ? (
        <p className={stageCoachGuideHint}>
          <LocalizedText>{guide.hint}</LocalizedText>
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {guide.examples.map((example) => {
          const selected = multiSelect && selectedExamples.includes(example);
          return (
            <li key={example}>
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  multiSelect
                    ? onToggleExample?.(example)
                    : onPickExample(example)
                }
                className={[
                  stageCoachGuideChip,
                  selected ? stageCoachGuideChipSelected : "",
                ].join(" ")}
                aria-pressed={multiSelect ? selected : undefined}
              >
                <span className={selected ? "text-on-spotlight/90" : "text-subtle"}>
                  {multiSelect
                    ? selected
                      ? t("coach.guide.added")
                      : t("coach.guide.add")
                    : examplesReferenceOnly
                      ? t("coach.guide.reference")
                      : t("coach.guide.example")}
                  :
                </span>{" "}
                <LocalizedText>{example}</LocalizedText>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
