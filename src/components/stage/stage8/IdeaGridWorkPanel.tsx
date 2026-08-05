"use client";

import { useState } from "react";
import { useUiLocale } from "@/hooks/useUiLocale";
import { ParkingLotTray } from "@/components/stage/shared/ParkingLotTray";
import { IdeaGridBoard } from "@/components/stage/stage8/IdeaGridBoard";
import { IdeaGridHmwSetupPanel } from "@/components/stage/stage8/IdeaGridHmwSetupPanel";
import { IdeaInputSketchPanel } from "@/components/stage/stage8/IdeaInputSketchPanel";
import { PrincipleCardPanel } from "@/components/stage/stage8/PrincipleCardPanel";
import { ScamperGuidedPanel } from "@/components/stage/stage8/ScamperGuidedPanel";
import { TeamPersonaPanel } from "@/components/stage/stage8/TeamPersonaPanel";
import { TermChip } from "@/components/stage/TermChip";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { hmwForCell } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import { shouldOpenIdeaEditor } from "@/lib/stages/stage8/gridCellHmw";
import {
  createIdeaId,
  firstEmptyCellIndex,
  type IdeaGridData,
  type IdeaStimulusType,
} from "@/lib/stages/stage8/ideaGridTypes";
import type {
  HmwInterpretation,
  Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  stageCaption,
  stageLabel,
  stagePanel,
} from "@/lib/stages/ui";

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
  onCacheInterpretations: (
    questionId: string,
    interpretations: HmwInterpretation[],
  ) => void;
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
  onCacheInterpretations,
}: IdeaGridWorkPanelProps) {
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(8, locale);
  const allQuestions = hmwData.questions;
  const [stimulusNote, setStimulusNote] = useState<string | null>(null);

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

  const openEmptyOrEditorForStimulus = (
    stimulusId: string,
    stimulusType: Extract<IdeaStimulusType, "principle_card" | "team_persona">,
  ) => {
    const empty = firstEmptyCellIndex(data);
    const index = empty ?? 0;
    const question = hmwForCell(data, allQuestions, index);
    const slot = data.slots[index];

    const stampSlots = () =>
      data.slots.map((s, i) => {
        if (i !== index) return s;
        if (s?.title.trim()) {
          return { ...s, stimulusId, stimulusType };
        }
        return {
          id: s?.id ?? createIdeaId(),
          title: s?.title ?? "",
          description: s?.description ?? "",
          tags: s?.tags ?? [],
          sketchDataUrl:
            s?.sketchDataUrl?.trim() ||
            s?.referenceSketchDataUrl?.trim() ||
            "",
          sourceHmwId: s?.sourceHmwId || question?.id || "",
          sourceHmwText:
            s?.sourceHmwText || question?.hmwText.trim() || "",
          stimulusId,
          stimulusType,
        };
      });

    if (shouldOpenIdeaEditor(data, question, index) || question?.hmwText.trim() || slot?.title.trim()) {
      onChange({
        ...data,
        selectedCellIndex: index,
        activeView: "editor",
        slots: stampSlots(),
      });
      return;
    }
    onChange({
      ...data,
      selectedCellIndex: index,
      activeView: "hmw_setup",
      slots: stampSlots(),
    });
  };

  const unparkIdea = (id: string) => {
    const idea = (data.bankedIdeas ?? []).find((i) => i.id === id);
    if (!idea) return;
    const empty = firstEmptyCellIndex(data);
    if (empty == null) {
      setStimulusNote("빈 칸이 없어요. 칸을 비우거나 그리드를 늘린 뒤 꺼내 주세요.");
      return;
    }
    const slots = [...data.slots];
    slots[empty] = idea;
    onChange({
      ...data,
      slots,
      bankedIdeas: (data.bankedIdeas ?? []).filter((i) => i.id !== id),
      cellHmwIds: data.cellHmwIds.map((hid, i) =>
        i === empty ? idea.sourceHmwId || hid : hid,
      ),
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
          {hmwData.coreSelectionApplied
            ? "핵심 니즈 기반 HMW로 칸이 채워져 있어요. 칸을 눌러 아이디어를 펼쳐 보세요."
            : "앞 단계 HMW 질문이 칸에 배치돼 있어요. HMW가 있는 칸은 아이디어를, 비어 있는 칸은 니즈·HMW를 이어서 만들 수 있어요."}
        </p>
      )}

      {data.activeView === "editor" && data.selectedCellIndex !== null ? (
        <IdeaInputSketchPanel
          projectId={projectId}
          data={data}
          cellIndex={data.selectedCellIndex}
          hmwQuestions={allQuestions}
          stage5Data={stage5Data}
          onChange={onChange}
          onClose={closeSubview}
          onCacheInterpretations={onCacheInterpretations}
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
      ) : data.activeView === "principle" ? (
        <PrincipleCardPanel
          data={data}
          onChange={onChange}
          onClose={closeSubview}
          onApplyToIdea={(card) =>
            openEmptyOrEditorForStimulus(card.id, "principle_card")
          }
        />
      ) : data.activeView === "team_persona" ? (
        <TeamPersonaPanel
          onClose={closeSubview}
          onPick={(prompt) =>
            openEmptyOrEditorForStimulus(prompt.id, "team_persona")
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="min-w-0 space-y-3">
            {stimulusNote ? (
              <p className="rounded-md bg-cream px-3 py-2 text-[13px] font-medium text-foreground break-keep">
                Kevin: {stimulusNote}
              </p>
            ) : null}
            <IdeaGridBoard
              data={data}
              hmwQuestions={allQuestions}
              onSelectCell={openCell}
            />
          </div>

          <ParkingLotTray
            title="아이디어 은행"
            hint="칸을 비울 때 보류로 두면 여기에 쌓여요."
            items={(data.bankedIdeas ?? []).map((idea) => ({
              id: idea.id,
              text: idea.title,
              meta: idea.sourceHmwText
                ? `HMW · ${idea.sourceHmwText.slice(0, 40)}`
                : "보류 아이디어",
            }))}
            emptyLabel="보류한 아이디어가 없어요"
            onUnpark={unparkIdea}
          />
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
