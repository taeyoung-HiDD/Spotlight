"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { IconLetterS } from "@tabler/icons-react";
import { IdeaGridBoard } from "@/components/stage/stage8/IdeaGridBoard";
import { IdeaGridHmwSetupPanel } from "@/components/stage/stage8/IdeaGridHmwSetupPanel";
import { IdeaInputSketchPanel } from "@/components/stage/stage8/IdeaInputSketchPanel";
import { ScamperGuidedPanel } from "@/components/stage/stage8/ScamperGuidedPanel";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { hmwForCell } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import { shouldOpenIdeaEditor } from "@/lib/stages/stage8/gridCellHmw";
import type { IdeaGridData } from "@/lib/stages/stage8/ideaGridTypes";
import type { Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  stageBtnSecondary,
  stageCaption,
  stageLabel,
  stagePanel,
} from "@/lib/stages/ui";
import { TermChip } from "@/components/stage/TermChip";

interface IdeaGridWorkPanelProps {
  projectId: string;
  data: IdeaGridData;
  hmwData: Stage7HmwData;
  stage5Data: Stage5LatentNeedsData;
  onChange: (data: IdeaGridData) => void;
  onSaveNeedHmw: (result: {
    grid: IdeaGridData;
    hmw: Stage7HmwData;
    stage5: Stage5LatentNeedsData;
  }) => Promise<void>;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

export function IdeaGridWorkPanel({
  projectId,
  data,
  hmwData,
  stage5Data,
  onChange,
  onSaveNeedHmw,
  saving,
  saveError,
  lastSavedAt,
}: IdeaGridWorkPanelProps) {
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(8, locale);
  const allQuestions = hmwData.questions;

  const openCell = (index: number) => {
    const question = hmwForCell(data, allQuestions, index);
    if (shouldOpenIdeaEditor(data, question, index)) {
      onChange({
        ...data,
        selectedCellIndex: index,
        activeView: "editor",
      });
      return;
    }
    onChange({
      ...data,
      selectedCellIndex: index,
      activeView: "hmw_setup",
    });
  };

  const closeSubview = () => {
    onChange({
      ...data,
      selectedCellIndex: null,
      activeView: "grid",
    });
  };

  const openScamper = () => {
    onChange({
      ...data,
      activeView: "scamper",
      scamperSourceIdeaId: data.slots.find((s) => s?.title.trim())?.id ?? "",
    });
  };

  return (
    <section className={stagePanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={stageLabel}>아이디어 펼치기</span>
        <TermChip
          label="용어"
          definition="Quantity-first — 먼저 많이 펼치고, 평가·우선순위는 다음 단계에서 해요."
        />
      </div>

      <p className={`mb-4 ${stageCaption}`}>{purposeCopy.purpose}</p>

      {allQuestions.length === 0 ? (
        <div className="mb-4 rounded-xl border border-dashed border-border-warm bg-cream/50 px-4 py-3">
          <p className={stageCaption}>
            7단계 HMW가 아직 없어요. 그리드 칸을 눌러 니즈와 HMW를 직접 만들 수
            있어요.
          </p>
        </div>
      ) : (
        <p className={`mb-4 ${stageCaption}`}>
          앞 단계 HMW 질문이 칸에 배치돼 있어요. HMW가 있는 칸은 아이디어를, 비어
          있는 칸은 니즈·HMW를 이어서 만들 수 있어요.
        </p>
      )}

      {data.activeView === "editor" && data.selectedCellIndex !== null ? (
        <IdeaInputSketchPanel
          projectId={projectId}
          data={data}
          cellIndex={data.selectedCellIndex}
          hmwQuestions={allQuestions}
          onChange={onChange}
          onClose={closeSubview}
        />
      ) : data.activeView === "hmw_setup" && data.selectedCellIndex !== null ? (
        <IdeaGridHmwSetupPanel
          projectId={projectId}
          data={data}
          hmwData={hmwData}
          stage5Data={stage5Data}
          cellIndex={data.selectedCellIndex}
          onSave={onSaveNeedHmw}
          onClose={closeSubview}
        />
      ) : data.activeView === "scamper" ? (
        <ScamperGuidedPanel
          data={data}
          onChange={onChange}
          onClose={closeSubview}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <IdeaGridBoard
            data={data}
            hmwQuestions={allQuestions}
            onSelectCell={openCell}
          />
          <aside className="rounded-xl border border-border-warm bg-cream/40 p-3">
            <p className={`mb-2 ${stageLabel}`}>막힐 때 보강 도구</p>
            <button
              type="button"
              onClick={openScamper}
              className="flex w-full items-center gap-2 rounded-lg border border-border-warm bg-panel px-3 py-2.5 text-left hover:border-spotlight/40"
            >
              <span className="flex size-7 items-center justify-center rounded-md border border-border-warm bg-cream text-sm font-bold">
                <IconLetterS className="size-4" stroke={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  SCAMPER
                </span>
                <span className={`${stageCaption} text-muted`}>
                  7글자로 비틀어보기
                </span>
              </span>
            </button>
            <p className={`mt-3 ${stageCaption}`}>
              먼저 양으로 펼친다. 평가는 9단계 우선순위에서 해요.
            </p>
          </aside>
        </div>
      )}

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
