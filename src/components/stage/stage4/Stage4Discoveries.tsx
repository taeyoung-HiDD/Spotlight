"use client";

import { IconPlus, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import {
  STAGE4_DATA_SYNTHESIS_PAGE,
  STAGE4_EMPATHY_MAP_PAGE,
} from "@/lib/navigation/stageNavLabels";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { Stage4ResearchSynthesisPanel } from "@/components/stage/stage4/Stage4ResearchSynthesisPanel";
import {
  fetchStage4Discoveries,
  saveStage4Discoveries,
} from "@/lib/artifacts/stage4Discoveries";
import { fetchStage3FieldResearch } from "@/lib/artifacts/stage3FieldResearch";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { EmpathyPostitBoard } from "@/components/stage/stage4/EmpathyPostitBoard";
import {
  PersonaThumbnailEmpty,
  PersonaThumbnailField,
} from "@/components/stage/stage4/PersonaThumbnailField";
import {
  importFromEmpathyMaps,
  importFromStage3Sessions,
} from "@/lib/stages/stage4/bootstrapFromStage3";
import { buildSynthesisDebriefContext } from "@/lib/stages/stage4/buildSynthesisDebriefContext";
import { requestKevinSynthesisDebrief } from "@/lib/stages/stage4/researchCoachDebriefClient";
import {
  canAdvanceToStage5,
  canAdvanceToSynthesis,
} from "@/lib/stages/stage4/researchSynthesisGates";
import type {
  EmpathyQuadrantId,
  EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";
import { resolvePersonaThumbnailDisplayUrl } from "@/lib/stages/stage4/personaThumbnail";
import {
  createStage4PersonaMap,
  defaultStage4Data,
  type Stage4DiscoveriesData,
  type Stage4WorkflowPhase,
} from "@/lib/stages/stage4/types";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import {
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
  stageTextarea,
} from "@/lib/stages/ui";


interface Stage4DiscoveriesProps {
  projectId: string;
}

const MAX_PERSONAS = 8;

function personaTabLabel(index: number, name: string): string {
  return name.trim() || `페르소나 ${index + 1}`;
}

const STAGE4_EMPATHY_COACH_MESSAGES: CoachDialogItem[] = [
  {
    type: "highlight",
    label: "발견 정리하기 · 공감맵",
    content:
      "탭으로 페르소나를 추가한 뒤, 각 사람의 말·생각·행동·감정을 나눠 정리해요.",
  },
  {
    type: "bubble",
    content:
      "단계 3 조사 기록을 보며 사람별 공감맵을 채우면, 다음 데이터 정리에서 한눈에 비교하기 쉬워져요.",
  },
];

const STAGE4_SYNTHESIS_COACH_MESSAGES: CoachDialogItem[] = [
  {
    type: "highlight",
    label: "데이터 정리",
    content:
      "노란색은 언급·관찰, 파란색은 발견한 것이에요. 발견한 것은 조사 중 떠오른 생각·인사이트를 직접 적어요.",
  },
  {
    type: "bubble",
    content:
      "조사 대상별로 언급·관찰·발견한 것을 나눠 적고, 테마로 묶어 보세요. 발견한 것은 조사 과정에서 떠오른 내용을 직접 적어요.",
  },
  {
    type: "bubble",
    content:
      "단계 3 조사 기록·공감맵 가져오기로 언급·관찰 초안을 채운 뒤, 발견한 것은 조사자 인사이트를 직접 적어 주세요. 팀 디브리핑 음성 업로드나 Kevin 디브리핑 요청도 활용해 보세요.",
  },
];

export function Stage4Discoveries({ projectId }: Stage4DiscoveriesProps) {
  const router = useRouter();
  const [data, setData] = useState<Stage4DiscoveriesData>(defaultStage4Data());
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [kevinDebriefLoading, setKevinDebriefLoading] = useState(false);
  const [coachInjectedExchange, setCoachInjectedExchange] = useState<{
    id: string;
    userText: string;
    coachText: string;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activePersonaIndex, setActivePersonaIndex] = useState(0);

  const formatSavedTime = useCallback(() => {
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  const phase: Stage4WorkflowPhase = data.workflowPhase;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchStage4Discoveries(projectId);
        if (!cancelled) {
          setData(result.data);
          setArtifactId(result.artifactId);
        }
      } catch (e) {
        if (!cancelled) {
          setSaveError(
            e instanceof Error ? e.message : "자료를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    setActivePersonaIndex((prev) =>
      Math.min(prev, Math.max(0, data.empathyMaps.length - 1)),
    );
  }, [data.empathyMaps.length]);

  const saveArtifact = useCallback(
    async (next: Stage4DiscoveriesData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const { artifactId: id } = await saveStage4Discoveries({
          projectId,
          artifactId,
          data: next,
        });
        setArtifactId(id);
        setLastSavedAt(formatSavedTime());
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [artifactId, formatSavedTime, projectId],
  );

  const { flush: flushSave } = useDebouncedPersist({
    data,
    enabled: !loading,
    save: saveArtifact,
  });

  const setPhase = useCallback((next: Stage4WorkflowPhase) => {
    setData((prev) => ({ ...prev, workflowPhase: next }));
  }, []);

  const addPersona = useCallback(() => {
    setData((prev) => {
      if (prev.empathyMaps.length >= MAX_PERSONAS) return prev;
      const newIndex = prev.empathyMaps.length;
      const nextMaps = [
        ...prev.empathyMaps,
        createStage4PersonaMap(newIndex),
      ];
      setActivePersonaIndex(newIndex);
      return {
        ...prev,
        personaTargetCount: nextMaps.length,
        empathyMaps: nextMaps,
      };
    });
  }, []);

  const removePersona = useCallback((index: number) => {
    const map = data.empathyMaps[index];
    if (!map || data.empathyMaps.length <= 1) return;

    const label = personaTabLabel(index, map.personaName);
    const ok = window.confirm(
      `「${label}」 공감맵을 삭제할까요?\n\n입력한 내용은 복구할 수 없어요.`,
    );
    if (!ok) return;

    setData((prev) => {
      if (prev.empathyMaps.length <= 1) return prev;
      const nextMaps = prev.empathyMaps.filter((_, i) => i !== index);
      return {
        ...prev,
        personaTargetCount: nextMaps.length,
        empathyMaps: nextMaps,
      };
    });
    setActivePersonaIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  }, [data.empathyMaps]);

  const updatePersonaField = useCallback(
    (
      index: number,
      field: "personaName" | "personaContext" | "personaThumbnailUrl",
      value: string,
    ) => {
      setData((prev) => {
        const next = [...prev.empathyMaps];
        const item = next[index];
        if (!item) return prev;
        next[index] = { ...item, [field]: value };
        return { ...prev, empathyMaps: next };
      });
    },
    [],
  );

  const updateQuadrantItems = useCallback(
    (
      index: number,
      quadrant: EmpathyQuadrantId,
      items: EmpathyStickyItem[],
    ) => {
      setData((prev) => {
        const next = [...prev.empathyMaps];
        const item = next[index];
        if (!item) return prev;
        next[index] = {
          ...item,
          quadrants: {
            ...item.quadrants,
            [quadrant]: items,
          },
        };
        return { ...prev, empathyMaps: next };
      });
    },
    [],
  );

  const persistNow = useCallback(async (): Promise<boolean> => {
    try {
      await flushSave();
      return true;
    } catch {
      return false;
    }
  }, [flushSave]);

  const handleContinueToSynthesis = useCallback(async () => {
    const ok = await persistNow();
    if (!ok) return;
    setPhase("research_synthesis");
  }, [persistNow, setPhase]);

  const handleContinueToStage5 = useCallback(async () => {
    const ok = await persistNow();
    if (!ok) return;
    router.push(`/project/${projectId}/stage/5`);
  }, [persistNow, projectId, router]);

  const handleImportStage3 = useCallback(async () => {
    setImporting(true);
    setSaveError(null);
    try {
      const { data: field } = await fetchStage3FieldResearch(projectId);
      setData((prev) => ({
        ...prev,
        researchSynthesis: importFromStage3Sessions(
          prev.researchSynthesis,
          field,
        ),
      }));
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "단계 3 자료를 가져오지 못했습니다.",
      );
    } finally {
      setImporting(false);
    }
  }, [projectId]);

  const handleImportEmpathy = useCallback(() => {
    setData((prev) => ({
      ...prev,
      researchSynthesis: importFromEmpathyMaps(
        prev.researchSynthesis,
        prev.empathyMaps,
      ),
    }));
  }, []);

  const handleRequestKevinDebrief = useCallback(async () => {
    setKevinDebriefLoading(true);
    setSaveError(null);
    try {
      const debrief = await requestKevinSynthesisDebrief({
        projectId,
        synthesis: data.researchSynthesis,
      });
      setCoachInjectedExchange({
        id: `kevin-debrief-${Date.now()}`,
        userText:
          "지금까지 정리한 포스트잇·리서치 자료를 바탕으로 팀 디브리핑을 도와주세요.",
        coachText: debrief,
      });
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "디브리핑 요청에 실패했습니다.",
      );
    } finally {
      setKevinDebriefLoading(false);
    }
  }, [data.researchSynthesis, projectId]);

  const canGoSynthesis = canAdvanceToSynthesis(data);
  const canGoStage5 = canAdvanceToStage5(data);
  const activeMap = data.empathyMaps[activePersonaIndex];

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 4,
      stageTitle:
        phase === "empathy_maps" ? "발견 정리하기 · 공감맵" : "데이터 정리",
      artifactSummary:
        phase === "empathy_maps"
          ? `페르소나 ${data.empathyMaps.length}명 · 공감맵 ${data.empathyMaps.length}개`
          : buildSynthesisDebriefContext(data.researchSynthesis),
      stageBehaviorNote:
        phase === "research_synthesis"
          ? "데이터 정리 단계입니다. 발견한 것(파란색)은 조사자 인사이트 직접 입력입니다. 팀 디브리핑은 Kevin 디브리핑 요청으로 종합 정리할 수 있습니다."
          : undefined,
    }),
    [projectId, phase, data.empathyMaps.length, data.researchSynthesis],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-warm bg-white px-6 py-12 text-center text-[16px] text-muted">
        발견 정리 자료를 불러오는 중…
      </div>
    );
  }

  return (
    <StageContainer
      stageNumber={4}
      sceneKey={`stage-4-${projectId}-${phase}`}
      coach={
        <AnimatedCoachPanel
          sceneKey={`stage-4-coach-${projectId}-${phase}`}
          statusLabel="짚어주는 중"
          statusSub={
            phase === "empathy_maps" ? "공감맵 정리" : "데이터 정리"
          }
          messages={
            phase === "empathy_maps"
              ? STAGE4_EMPATHY_COACH_MESSAGES
              : STAGE4_SYNTHESIS_COACH_MESSAGES
          }
          inputGuide={getStageWorkInputGuide(4)}
          chatContext={chatContext}
          injectedExchange={
            phase === "research_synthesis" ? coachInjectedExchange : null
          }
        />
      }
      work={
        <div className="space-y-4">
          {phase === "empathy_maps" ? (
            <section className={stagePanel}>
              <h2 className={stageSectionTitle}>첫 섹션 · 공감맵 정리</h2>
              <p className={`mt-1 ${stageSectionLead}`}>
                조사 기록을 보며 탭으로 페르소나를 추가하고, 각 사람의 공감맵을
                채워 주세요. (최대 {MAX_PERSONAS}명)
              </p>

              <div
                className="mt-5 border-t border-border-warm pt-4"
                role="tablist"
                aria-label="페르소나별 공감맵"
              >
                <p className={`mb-2.5 ${stageLabel}`}>페르소나</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {data.empathyMaps.map((map, idx) => {
                    const selected = activePersonaIndex === idx;
                    const canRemove = data.empathyMaps.length > 1;
                    return (
                      <div
                        key={map.id}
                        className={[
                          "inline-flex items-stretch overflow-hidden rounded-md border",
                          selected
                            ? "border-spotlight"
                            : "border-border-warm",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          aria-controls={`empathy-map-panel-${map.id}`}
                          id={`empathy-map-tab-${map.id}`}
                          onClick={() => setActivePersonaIndex(idx)}
                          className={[
                            "inline-flex items-center gap-2 px-2.5 py-1.5 text-[15px] font-semibold transition-colors break-keep",
                            selected
                              ? "bg-spotlight text-on-spotlight"
                              : "bg-cream text-foreground hover:bg-surface",
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
                        {canRemove ? (
                          <button
                            type="button"
                            aria-label={`${personaTabLabel(idx, map.personaName)} 삭제`}
                            onClick={() => removePersona(idx)}
                            className={[
                              "inline-flex items-center justify-center border-l px-2 transition-colors",
                              selected
                                ? "border-on-spotlight/25 bg-spotlight text-on-spotlight hover:bg-spotlight/90"
                                : "border-border-warm bg-cream text-muted hover:bg-surface hover:text-foreground",
                            ].join(" ")}
                          >
                            <IconX className="size-3.5" stroke={2.5} aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    disabled={data.empathyMaps.length >= MAX_PERSONAS}
                    onClick={addPersona}
                    aria-label="페르소나 추가"
                    className={[
                      "inline-flex items-center gap-1 rounded-md border border-dashed px-3 py-2 text-[15px] font-semibold transition-colors",
                      data.empathyMaps.length >= MAX_PERSONAS
                        ? "cursor-not-allowed border-border-warm text-subtle opacity-50"
                        : "border-spotlight/50 bg-cream text-foreground hover:border-spotlight hover:bg-highlight",
                    ].join(" ")}
                  >
                    <IconPlus className="size-4" stroke={2} aria-hidden />
                    추가
                  </button>
                </div>
              </div>

              {activeMap ? (
                <div
                  role="tabpanel"
                  id={`empathy-map-panel-${activeMap.id}`}
                  aria-labelledby={`empathy-map-tab-${activeMap.id}`}
                  className="mt-4 rounded-xl border border-border-warm bg-cream/50 p-4"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`persona-name-${activeMap.id}`}
                        className={`mb-1.5 block ${stageLabel}`}
                      >
                        이름
                      </label>
                      <input
                        id={`persona-name-${activeMap.id}`}
                        value={activeMap.personaName}
                        onChange={(e) =>
                          updatePersonaField(
                            activePersonaIndex,
                            "personaName",
                            e.target.value,
                          )
                        }
                        placeholder="이름"
                        className={`w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput}`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`persona-context-${activeMap.id}`}
                        className={`mb-1.5 block ${stageLabel}`}
                      >
                        한 줄 컨텍스트
                      </label>
                      <input
                        id={`persona-context-${activeMap.id}`}
                        value={activeMap.personaContext}
                        onChange={(e) =>
                          updatePersonaField(
                            activePersonaIndex,
                            "personaContext",
                            e.target.value,
                          )
                        }
                        placeholder="한 줄 컨텍스트"
                        className={`w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput}`}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <EmpathyPostitBoard
                      quadrants={activeMap.quadrants}
                      personaName={activeMap.personaName}
                      personaContext={activeMap.personaContext}
                      personaThumbnailUrl={activeMap.personaThumbnailUrl}
                      onThumbnailChange={(url) =>
                        updatePersonaField(
                          activePersonaIndex,
                          "personaThumbnailUrl",
                          url,
                        )
                      }
                      onChange={(quadrantId, items) =>
                        updateQuadrantItems(activePersonaIndex, quadrantId, items)
                      }
                    />
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <Stage4ResearchSynthesisPanel
              projectId={projectId}
              synthesis={data.researchSynthesis}
              onChange={(researchSynthesis) =>
                setData((prev) => ({ ...prev, researchSynthesis }))
              }
              onImportStage3={() => void handleImportStage3()}
              onImportEmpathy={handleImportEmpathy}
              importing={importing}
              onRequestKevinDebrief={() => void handleRequestKevinDebrief()}
              kevinDebriefLoading={kevinDebriefLoading}
            />
          )}

          {phase === "empathy_maps" ? (
            <section className={stagePanel}>
              <label className={stageLabel}>교차 인사이트 메모</label>
              <textarea
                rows={3}
                value={data.synthesisNote}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    synthesisNote: e.target.value,
                  }))
                }
                placeholder="공감맵 간 공통점/차이점 (선택)"
                className={`mt-1 w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageTextarea}`}
              />
            </section>
          ) : null}

          <div
            className={`${stagePanel} flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              {phase === "empathy_maps"
                ? canGoSynthesis
                  ? "공감맵을 정리했으면 데이터 정리로 넘어가 주세요."
                  : "페르소나 이름·공감맵 중 최소 한 가지는 적어 주세요."
                : canGoStage5
                  ? "데이터를 정리했으면 니즈 분석 단계로 진행할 수 있어요."
                  : "조사 대상·포스트잇 중 최소 한 가지는 적어 주세요."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={3}
                backPageName={
                  phase === "research_synthesis"
                    ? STAGE4_EMPATHY_MAP_PAGE
                    : undefined
                }
                onInternalBack={
                  phase === "research_synthesis"
                    ? () => {
                        setPhase("empathy_maps");
                        return true;
                      }
                    : undefined
                }
              />
              {phase === "empathy_maps" ? (
                <WorkspaceForwardButton
                  pageName={STAGE4_DATA_SYNTHESIS_PAGE}
                  disabled={!canGoSynthesis || saving}
                  onClick={() => void handleContinueToSynthesis()}
                />
              ) : (
                <WorkspaceForwardButton
                  stageId={5}
                  disabled={!canGoStage5 || saving}
                  onClick={() => void handleContinueToStage5()}
                />
              )}
            </div>
            <p className={`w-full ${stageCaption}`}>
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
      }
    />
  );
}
