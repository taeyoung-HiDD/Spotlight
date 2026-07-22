"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { SimulatedAsyncProgressPanel } from "@/components/stage/SimulatedAsyncProgressPanel";
import { EmpathyPostitBoard } from "@/components/stage/stage4/EmpathyPostitBoard";
import { PersonaThumbnailEmpty } from "@/components/stage/stage4/PersonaThumbnailField";
import { useSimulatedAsyncProgress } from "@/hooks/useSimulatedAsyncProgress";
import { STAGE3_TO_KNOW_PAGE } from "@/lib/navigation/stageNavLabels";
import { fillStage3EmpathyMapsWithAiDraft } from "@/lib/stages/fieldResearch/generateStage3EmpathyDraftClient";
import { generatePersonaBio } from "@/lib/stages/fieldResearch/generatePersonaBioClient";
import {
  hasStage3EmpathyQuadrantDraft,
} from "@/lib/stages/fieldResearch/stage3EmpathyMap";
import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import type { EmpathyQuadrantId, EmpathyStickyItem } from "@/lib/stages/stage2/empathyMap";
import { applyPersonaBioToMapFields } from "@/lib/stages/stage4/types";
import { resolvePersonaThumbnailDisplayUrl } from "@/lib/stages/stage4/personaThumbnail";
import {
  stageCaption,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface Stage3EmpathyMapWorkPanelProps {
  projectId: string;
  data: FieldResearchData;
  onChange: (data: FieldResearchData) => void;
  onAdvanceToToKnow: () => void;
  problem: string;
  prePmfSummary: string;
  editable?: boolean;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

function personaTabLabel(index: number, name: string): string {
  return name.trim() || `타겟 ${index + 1}`;
}

export function Stage3EmpathyMapWorkPanel({
  projectId,
  data,
  onChange,
  onAdvanceToToKnow,
  problem,
  prePmfSummary,
  editable = true,
  saving,
  saveError,
  lastSavedAt,
}: Stage3EmpathyMapWorkPanelProps) {
  const [activePersonaIndex, setActivePersonaIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [bioGenerating, setBioGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const draftReady = hasStage3EmpathyQuadrantDraft(data);
  const activeMap = data.empathyMaps[activePersonaIndex];
  const { progress, remainingSec, markComplete, reset } = useSimulatedAsyncProgress(
    generating,
    22_000,
  );

  useEffect(() => {
    setActivePersonaIndex((prev) =>
      Math.min(prev, Math.max(0, data.empathyMaps.length - 1)),
    );
  }, [data.empathyMaps.length]);

  const updateMap = useCallback(
    (index: number, patch: Partial<FieldResearchData["empathyMaps"][number]>) => {
      onChange({
        ...data,
        empathyMaps: data.empathyMaps.map((map, idx) =>
          idx === index ? { ...map, ...patch } : map,
        ),
      });
    },
    [data, onChange],
  );

  const updateQuadrantItems = useCallback(
    (
      index: number,
      quadrant: EmpathyQuadrantId,
      items: EmpathyStickyItem[],
    ) => {
      const map = data.empathyMaps[index];
      if (!map) return;
      updateMap(index, {
        quadrants: {
          ...map.quadrants,
          [quadrant]: items,
        },
      });
    },
    [data.empathyMaps, updateMap],
  );

  const handleGenerateDraft = useCallback(async () => {
    if (!editable || generating) return;
    setGenerating(true);
    setGenError(null);
    reset();
    try {
      const personas = data.empathyMaps.map((map) => ({
        personaName: map.personaName,
        personaContext: map.personaContext,
        personaBio: map.personaBio,
        personaProfile: map.personaProfile,
      }));
      const nextMaps = await fillStage3EmpathyMapsWithAiDraft(
        data.empathyMaps,
        {
          problem,
          prePmfSummary: prePmfSummary || undefined,
          personas,
        },
      );
      markComplete();
      onChange({ ...data, empathyMaps: nextMaps });
    } catch (e) {
      setGenError(
        e instanceof Error ? e.message : "공감맵 초안 생성에 실패했습니다.",
      );
    } finally {
      setGenerating(false);
    }
  }, [
    data,
    editable,
    generating,
    markComplete,
    onChange,
    prePmfSummary,
    problem,
    reset,
  ]);

  const handleGenerateBio = useCallback(async () => {
    const map = data.empathyMaps[activePersonaIndex];
    if (!editable || bioGenerating || !map) return;
    setBioGenerating(true);
    setGenError(null);
    try {
      const { bio, profile } = await generatePersonaBio({
        problem,
        prePmfSummary: prePmfSummary || undefined,
        personaName: map.personaName,
        personaContext: map.personaContext,
        existingBio: map.personaBio,
        personaProfile: map.personaProfile,
        excludeProfileIds: data.empathyMaps
          .map((m) => m.personaProfile?.sourceId)
          .filter((id): id is string => Boolean(id)),
      });
      updateMap(activePersonaIndex, {
        ...applyPersonaBioToMapFields(map, bio),
        personaProfile: profile ?? map.personaProfile,
      });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Bio 생성에 실패했습니다.");
    } finally {
      setBioGenerating(false);
    }
  }, [
    activePersonaIndex,
    bioGenerating,
    data.empathyMaps,
    editable,
    prePmfSummary,
    problem,
    updateMap,
  ]);

  const handleBioChange = useCallback(
    (bio: FieldResearchData["empathyMaps"][number]["personaBio"]) => {
      const map = data.empathyMaps[activePersonaIndex];
      if (!map) return;
      updateMap(activePersonaIndex, applyPersonaBioToMapFields(map, bio));
    },
    [activePersonaIndex, data.empathyMaps, updateMap],
  );

  return (
    <div className="space-y-4">
      <section className={stagePanel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={stageSectionTitle}>첫 섹션 · 공감맵 그리기</h2>
            <p className={`mt-1 ${stageSectionLead}`}>
              2단계 사전 조사에서 확정한 타겟 유저마다 공감맵을 채워 보세요.
              아직 현장 조사 전이므로 사전 조사·가설을 바탕으로 적되, 실제
              조사 후 수정할 수 있어요.
            </p>
          </div>
          {editable && !draftReady ? (
            <span className="shrink-0 rounded-full border border-border-warm bg-cream px-3 py-1 text-[12px] font-medium text-muted">
              {generating ? "AI 작성 중…" : "AI 준비됨"}
            </span>
          ) : null}
        </div>

        <div
          className="mt-5 border-t border-border-warm pt-4"
          role="tablist"
          aria-label="타겟 유저별 공감맵"
        >
          <p className={`mb-2.5 ${stageLabel}`}>타겟 유저 (사전 조사)</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {data.empathyMaps.map((map, idx) => {
              const selected = activePersonaIndex === idx;
              return (
                <button
                  key={map.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`stage3-empathy-panel-${map.id}`}
                  id={`stage3-empathy-tab-${map.id}`}
                  onClick={() => setActivePersonaIndex(idx)}
                  className={[
                    "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[15px] font-semibold transition-colors break-keep",
                    selected
                      ? "border-spotlight bg-spotlight text-on-spotlight"
                      : "border-border-warm bg-cream text-foreground hover:bg-surface",
                  ].join(" ")}
                >
                  <span className="size-6 shrink-0 overflow-hidden rounded-md border border-border-warm/60">
                    {map.personaThumbnailUrl.trim() ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={resolvePersonaThumbnailDisplayUrl(
                          map.personaThumbnailUrl,
                          map.personaName,
                          map.personaContext,
                        )}
                        alt=""
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            resolvePersonaThumbnailDisplayUrl(
                              "",
                              map.personaName,
                              map.personaContext,
                            );
                        }}
                      />
                    ) : (
                      <PersonaThumbnailEmpty variant="tab" />
                    )}
                  </span>
                  {personaTabLabel(idx, map.personaName)}
                </button>
              );
            })}
          </div>
        </div>

        {!draftReady ? (
          <div className="mt-6 rounded-xl border border-border-warm bg-cream/60 px-5 py-6">
            <p className="text-[15px] font-semibold text-foreground break-keep">
              타겟 유저별 공감맵 초안을 AI로 채울 수 있어요
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-muted break-keep">
              1·2단계에서 정리한 문제와 사전 조사를 바탕으로, 아래 말함·생각함·행동함·느낌
              네 칸에 <strong className="font-semibold text-gold">가설</strong>{" "}
              포스트잇을 넣어 드려요. 현장 조사 후에는 직접 고쳐 주세요.
            </p>
            {activeMap ? (
              <p className="mt-3 text-[13.5px] text-muted break-keep">
                현재 선택:{" "}
                <span className="font-semibold text-foreground">
                  {personaTabLabel(activePersonaIndex, activeMap.personaName)}
                </span>
                {activeMap.personaContext.trim()
                  ? ` · ${activeMap.personaContext.trim().slice(0, 80)}${
                      activeMap.personaContext.trim().length > 80 ? "…" : ""
                    }`
                  : null}
              </p>
            ) : null}
            {editable ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleGenerateDraft()}
                  disabled={generating || !data.empathyMaps.length}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-spotlight px-4 py-2.5 text-[14px] font-semibold text-on-spotlight transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconSparkles className="size-4" stroke={2} aria-hidden />
                  AI로 작성하기
                </button>
              </div>
            ) : null}
            {generating ? (
              <div className="mt-4">
                <SimulatedAsyncProgressPanel
                  title="타겟 유저별 공감맵 초안 작성 중"
                  progress={progress}
                  remainingSec={remainingSec}
                  ariaLabel="공감맵 AI 작성 진행률"
                  almostDoneLabel="포스트잇을 배치하는 중…"
                  completingLabel="공감맵에 반영하는 중…"
                />
              </div>
            ) : null}
            {genError ? (
              <p className="mt-3 text-[14px] text-rose-600 break-keep">{genError}</p>
            ) : null}
          </div>
        ) : null}

        {activeMap ? (
          <div
            id={`stage3-empathy-panel-${activeMap.id}`}
            role="tabpanel"
            aria-labelledby={`stage3-empathy-tab-${activeMap.id}`}
            className="mt-5"
          >
            {!draftReady ? (
              <p className={`mb-3 ${stageCaption} text-muted break-keep`}>
                아래 네 칸에 말함·생각함·행동함·느낌이 채워져요. 직접 적거나 「AI로
                작성하기」를 눌러 주세요.
              </p>
            ) : null}
            <div
              className={generating ? "pointer-events-none opacity-60" : undefined}
              aria-busy={generating}
            >
              <EmpathyPostitBoard
                quadrants={activeMap.quadrants}
                onChange={(quadrantId, items) =>
                  updateQuadrantItems(activePersonaIndex, quadrantId, items)
                }
                personaName={activeMap.personaName}
                personaContext={activeMap.personaContext}
                personaBio={activeMap.personaBio}
                personaProfile={activeMap.personaProfile}
                onBioChange={handleBioChange}
                onBioAiGenerate={() => void handleGenerateBio()}
                bioAiLoading={bioGenerating}
                bioEditable={editable && !generating}
                personaThumbnailUrl={activeMap.personaThumbnailUrl}
                onThumbnailChange={(url) =>
                  updateMap(activePersonaIndex, { personaThumbnailUrl: url })
                }
                mapId={activeMap.id}
              />
            </div>
          </div>
        ) : null}
      </section>

      <div
        className={`${stagePanel} stage-workspace-nav flex flex-wrap items-center justify-between gap-3`}
      >
        <p className={stageCaption}>
          {draftReady
            ? "공감맵 초안이 준비됐어요. To-know list로 이어가 주세요."
            : "「AI로 작성하기」로 초안을 채우거나, 직접 포스트잇을 적어 주세요."}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <WorkspaceBackButton projectId={projectId} fallbackStageId={2} />
          <WorkspaceForwardButton
            pageName={STAGE3_TO_KNOW_PAGE}
            disabled={!draftReady || saving}
            onClick={onAdvanceToToKnow}
          />
        </div>
        <p className="w-full text-[14px] text-muted">
          {saveError
            ? saveError
            : saving
              ? "저장 중…"
              : lastSavedAt
                ? `마지막 저장 ${lastSavedAt}`
                : "자동 저장됩니다."}
        </p>
      </div>
    </div>
  );
}
