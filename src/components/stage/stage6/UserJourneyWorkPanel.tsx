"use client";

import { IconFileTypePdf } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useUiLocale } from "@/hooks/useUiLocale";
import { UserJourneyBoard } from "@/components/stage/stage6/UserJourneyBoard";
import { TermChip } from "@/components/stage/TermChip";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import {
  downloadUserJourneyPdf,
  personasWithJourneyContent,
} from "@/lib/stages/stage6/userJourneyExport";
import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";
import {
  stageBtnSecondary,
  stageCaption,
  stageLabel,
  stagePanel,
} from "@/lib/stages/ui";

interface UserJourneyWorkPanelProps {
  projectId: string;
  data: UserJourneyMapData;
  onChange: (data: UserJourneyMapData) => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
  projectTitle?: string;
}

export function UserJourneyWorkPanel({
  projectId,
  data,
  onChange,
  saving,
  saveError,
  lastSavedAt,
  projectTitle,
}: UserJourneyWorkPanelProps) {
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(6, locale);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const canExport = personasWithJourneyContent(data).length > 0;

  const handleExportPdf = useCallback(async () => {
    if (!canExport || exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      const ok = await downloadUserJourneyPdf(data, {
        projectTitle: projectTitle?.trim() || undefined,
      });
      if (!ok) {
        setExportError("보낼 여정 지도 내용이 없어요.");
      }
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : "PDF를 만들지 못했습니다.",
      );
    } finally {
      setExporting(false);
    }
  }, [canExport, data, exporting, projectTitle]);

  return (
    <section className={stagePanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={stageLabel}>사용자 여정 지도 그리기</span>
        <div className="flex flex-wrap items-center gap-2">
          <TermChip
            label="용어"
            definition="User Journey Map — 사용자가 목표를 이루기까지 거치는 행동 단계를 시간 순으로 펼친 지도예요."
          />
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            disabled={!canExport || exporting}
            className={`${stageBtnSecondary} inline-flex items-center gap-1.5 px-2.5 py-1.5`}
            aria-label="사용자 여정 지도 PDF로 보내기"
          >
            <IconFileTypePdf className="size-3.5" stroke={2} aria-hidden />
            {exporting ? "PDF…" : "PDF로 보내기"}
          </button>
        </div>
      </div>

      <p className={`mb-4 ${stageCaption}`}>{purposeCopy.purpose}</p>

      <UserJourneyBoard
        projectId={projectId}
        data={data}
        onChange={onChange}
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-warm/60 pt-3">
        <p className={stageCaption}>
          {exportError
            ? exportError
            : saveError
              ? saveError
              : saving
                ? "저장 중…"
                : lastSavedAt
                  ? `마지막 저장 ${lastSavedAt}`
                  : "자동 저장됩니다."}
        </p>
        {!canExport ? (
          <p className={stageCaption}>
            여정 단계에 카드나 메모가 있으면 PDF로 보낼 수 있어요.
          </p>
        ) : null}
      </div>
    </section>
  );
}
