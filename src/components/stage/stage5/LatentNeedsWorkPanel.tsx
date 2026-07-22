"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { LatentNeedsBoard } from "@/components/stage/stage5/LatentNeedsBoard";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  stageCaption,
  stageLabel,
  stagePanel,
} from "@/lib/stages/ui";
import { TermChip } from "@/components/stage/TermChip";

interface LatentNeedsWorkPanelProps {
  data: Stage5LatentNeedsData;
  onChange: (data: Stage5LatentNeedsData) => void;
  onGenerate: () => void;
  generating: boolean;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

export function LatentNeedsWorkPanel({
  data,
  onChange,
  onGenerate,
  generating,
  saving,
  saveError,
  lastSavedAt,
}: LatentNeedsWorkPanelProps) {
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(5, locale);

  return (
    <section className={stagePanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={stageLabel}>니즈 분석하기</span>
        <TermChip
          label="용어"
          definition="언급·관찰(4단계) 아래에 있을 수 있는 잠재 니즈 — 아직 검증이 필요해요."
        />
      </div>

      <p className={`mb-4 ${stageCaption}`}>{purposeCopy.purpose}</p>

      <LatentNeedsBoard
        data={data}
        onChange={onChange}
        onGenerate={onGenerate}
        generating={generating}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-warm/60 pt-3">
        <p className={stageCaption}>
          {saveError
            ? saveError
            : saving
              ? "저장 중…"
              : lastSavedAt
                ? `마지막 저장 ${lastSavedAt}`
                : "자동 저장됩니다."}
        </p>
      </div>
    </section>
  );
}
