"use client";

import { UserJourneyBoard } from "@/components/stage/stage6/UserJourneyBoard";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";
import { stageCaption, stageLabel, stagePanel } from "@/lib/stages/ui";
import { TermChip } from "@/components/stage/TermChip";

interface UserJourneyWorkPanelProps {
  data: UserJourneyMapData;
  onChange: (data: UserJourneyMapData) => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

export function UserJourneyWorkPanel({
  data,
  onChange,
  saving,
  saveError,
  lastSavedAt,
}: UserJourneyWorkPanelProps) {
  const purposeCopy = getStagePurposeCopy(6);

  return (
    <section className={stagePanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={stageLabel}>사용자 여정 지도 그리기</span>
        <TermChip
          label="용어"
          definition="User Journey Map — 사용자가 목표를 이루기까지 거치는 행동 단계를 시간 순으로 펼친 지도예요."
        />
      </div>

      <p className={`mb-4 ${stageCaption}`}>{purposeCopy.purpose}</p>

      <UserJourneyBoard data={data} onChange={onChange} />

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
