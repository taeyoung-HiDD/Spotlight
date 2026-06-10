"use client";

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
  /** 복수 선택 모드일 때 선택된 예시 */
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
  if (!guide.examples.length) return null;

  const multiSelect = Boolean(guide.examplesMultiSelect && onToggleExample);

  return (
    <div className={stageCoachGuidePanel} role="region" aria-label={guide.title}>
      <div className={stageCoachGuideTitle}>{guide.title}</div>
      {guide.hint ? <p className={stageCoachGuideHint}>{guide.hint}</p> : null}
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
                aria-label={
                  multiSelect
                    ? selected
                      ? `입력란에서 제거: ${example}`
                      : `입력란에 추가: ${example}`
                    : examplesReferenceOnly
                      ? `참고 예시를 입력란에 넣기: ${example}`
                      : `예시 보내기: ${example}`
                }
              >
                <span className={selected ? "text-on-spotlight/90" : "text-subtle"}>
                  {multiSelect
                    ? selected
                      ? "추가됨"
                      : "추가"
                    : examplesReferenceOnly
                      ? "참고"
                      : "예"}
                  :
                </span>{" "}
                {example}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
