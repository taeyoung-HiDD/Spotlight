"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { HmwBoard } from "@/components/stage/stage7/HmwBoard";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import type { Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";
import { stageCaption, stageLabel, stagePanel } from "@/lib/stages/ui";
import { TermChip } from "@/components/stage/TermChip";

interface HmwWorkPanelProps {
  projectId: string;
  data: Stage7HmwData;
  onChange: (data: Stage7HmwData) => void;
  generating: boolean;
  onGenerate: () => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

export function HmwWorkPanel({
  projectId,
  data,
  onChange,
  generating,
  onGenerate,
  saving,
  saveError,
  lastSavedAt,
}: HmwWorkPanelProps) {
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(7, locale);

  return (
    <section className={stagePanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={stageLabel}>HMW 질문 만들기</span>
        <TermChip
          label="용어"
          definition="HMW(How Might We) — 잠재 니즈를 ‘어떻게 하면 …하기 위해 …할 수 있을까?’ 형태의 열린 질문으로 바꿔, 아이디어를 펼칠 출발점을 만드는 질문이에요."
        />
      </div>

      <p className={`mb-4 ${stageCaption}`}>{purposeCopy.purpose}</p>

      <HmwBoard
        projectId={projectId}
        data={data}
        onChange={onChange}
        generating={generating}
        onGenerate={onGenerate}
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
