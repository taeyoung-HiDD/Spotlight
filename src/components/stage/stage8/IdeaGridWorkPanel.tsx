"use client";

import { useMemo, useState } from "react";
import { useUiLocale } from "@/hooks/useUiLocale";
import { IconLetterS } from "@tabler/icons-react";
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
  hmwIdeaCoverage,
  prescribeStimulus,
} from "@/lib/stages/stage8/prescribeStimulus";
import { nextQuadrantPullHint } from "@/lib/stages/stage8/pullNextQuadrantHmw";
import {
  createIdeaId,
  firstEmptyCellIndex,
  type IdeaGridData,
  type IdeaStimulusType,
} from "@/lib/stages/stage8/ideaGridTypes";
import type { Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  stageBtnSecondary,
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
  onPullNextQuadrant: () => Promise<void>;
  pullingQuadrant: boolean;
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
  onPullNextQuadrant,
  pullingQuadrant,
  saving,
  saveError,
  lastSavedAt,
}: IdeaGridWorkPanelProps) {
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(8, locale);
  const allQuestions = hmwData.questions;
  const [stimulusNote, setStimulusNote] = useState<string | null>(null);

  const nextPull = useMemo(
    () => nextQuadrantPullHint(stage5Data, hmwData),
    [stage5Data, hmwData],
  );
  const coverage = useMemo(
    () => hmwIdeaCoverage(data, allQuestions),
    [data, allQuestions],
  );
  const emptyHmw = coverage.filter((c) => c.count === 0);

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

  const openAlternateView = () => {
    const prescription = prescribeStimulus(data, allQuestions);
    setStimulusNote(prescription.reason);
    if (prescription.type === "scamper") {
      openScamper();
      return;
    }
    if (prescription.type === "principle_card") {
      onChange({ ...data, activeView: "principle", selectedCellIndex: null });
      return;
    }
    onChange({ ...data, activeView: "team_persona", selectedCellIndex: null });
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
          sketchDataUrl: s?.sketchDataUrl ?? "",
          referenceSketchDataUrl: s?.referenceSketchDataUrl,
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

      {coverage.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {coverage.map((item) => (
            <span
              key={item.question.id}
              className={[
                "rounded-md border px-2.5 py-1 text-[12px] font-semibold",
                item.count === 0
                  ? "border-spotlight/50 bg-[#FFFDF4] text-foreground"
                  : "border-border-warm bg-cream text-foreground",
              ].join(" ")}
            >
              HMW {item.index} · {item.count}개
            </span>
          ))}
        </div>
      ) : null}

      {emptyHmw.length > 0 ? (
        <p className={`mb-3 rounded-md bg-[#FFFDF4] px-3 py-2 text-[13px] font-medium text-foreground break-keep`}>
          Kevin: {emptyHmw.map((e) => `${e.index}번`).join(", ")} 질문은 아직
          비어 있네요.
        </p>
      ) : null}

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
            ? "핵심 니즈 기반 HMW로 칸이 채워져 있어요. 더 필요하면 다음 사분면에서 HMW를 꺼내 올 수 있어요."
            : "앞 단계 HMW 질문이 칸에 배치돼 있어요. HMW가 있는 칸은 아이디어를, 비어 있는 칸은 니즈·HMW를 이어서 만들 수 있어요."}
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
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  {nextPull ? (
                    <p className={stageCaption}>
                      다음: {nextPull.label} · {nextPull.needs.length}개
                    </p>
                  ) : (
                    <p className={stageCaption}>
                      더 꺼낼 사분면 니즈가 없어요.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={openAlternateView}
                    className={stageBtnSecondary}
                  >
                    다른 관점이 필요해요
                  </button>
                  <button
                    type="button"
                    onClick={() => void onPullNextQuadrant()}
                    disabled={!nextPull || pullingQuadrant || saving}
                    className={stageBtnSecondary}
                  >
                    {pullingQuadrant
                      ? "Kevin이 HMW 만드는 중…"
                      : "다음 사분면에서 HMW 더 가져오기"}
                  </button>
                </div>
              </div>
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
            <aside className="rounded-xl border border-border-warm bg-cream/40 p-3">
              <p className={`mb-2 ${stageLabel}`}>막힐 때 보강 도구</p>
              <button
                type="button"
                onClick={openScamper}
                className="mb-2 flex w-full items-center gap-2 rounded-lg border border-border-warm bg-panel px-3 py-2.5 text-left hover:border-spotlight/40"
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
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    activeView: "principle",
                    selectedCellIndex: null,
                  })
                }
                className="mb-2 w-full rounded-lg border border-border-warm bg-panel px-3 py-2 text-left text-[13px] font-semibold hover:border-spotlight/40"
              >
                원리 카드
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...data,
                    activeView: "team_persona",
                    selectedCellIndex: null,
                  })
                }
                className="w-full rounded-lg border border-border-warm bg-panel px-3 py-2 text-left text-[13px] font-semibold hover:border-spotlight/40"
              >
                팀 관점
              </button>
              <p className={`mt-3 ${stageCaption}`}>
                먼저 스스로 펼치고, 막히면 「다른 관점이 필요해요」로 자극을
                받아 보세요.
              </p>
            </aside>
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
            : pullingQuadrant
              ? "다음 사분면 HMW를 만드는 중…"
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
