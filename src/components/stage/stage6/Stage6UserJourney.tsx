"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { useOptionalProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { UserJourneyCoachPanel } from "@/components/stage/stage6/UserJourneyCoachPanel";
import { UserJourneyWorkPanel } from "@/components/stage/stage6/UserJourneyWorkPanel";
import { fetchStage4Discoveries } from "@/lib/artifacts/stage4Discoveries";
import {
  fetchStage6UserJourney,
  saveStage6UserJourney,
} from "@/lib/artifacts/stage6UserJourney";
import { loadToKnowBuildContext } from "@/lib/stages/fieldResearch/stage3Bootstrap";
import {
  applyJourneyZoneAutoFill,
  collectJourneyZoneAutoFillTargets,
} from "@/lib/stages/stage6/autoFillJourneyZones";
import {
  autoPlacePoolItemsIntoJourney,
  journeyPlacementChanged,
  mergePriorStagesIntoJourney,
} from "@/lib/stages/stage6/bootstrapJourneyFromPriorStages";
import { requestJourneyStageGeneration } from "@/lib/stages/stage6/generateJourneyStagesClient";
import { requestJourneyZonesAutoFill } from "@/lib/stages/stage6/generateJourneyZoneClient";
import {
  defaultUserJourneyMap,
  JOURNEY_STAGES_GENERATION_VERSION,
  personaHasDefaultJourneySteps,
  replacePersonaJourneySteps,
  type UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
import type { ArtifactSlots } from "@/types/database";
import { stageCaption, stagePanel } from "@/lib/stages/ui";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";

interface Stage6UserJourneyProps {
  projectId: string;
}

function formatSavedTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function Stage6UserJourney({ projectId }: Stage6UserJourneyProps) {
  const router = useRouter();
  const workspace = useOptionalProjectWorkspace();
  const [data, setData] = useState<UserJourneyMapData>(defaultUserJourneyMap());
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<ArtifactSlots>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [zonesAutoFilling, setZonesAutoFilling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [journey, s4, ctx] = await Promise.all([
          fetchStage6UserJourney(projectId),
          fetchStage4Discoveries(projectId),
          loadToKnowBuildContext(projectId).catch(() => null),
        ]);
        if (cancelled) return;

        let merged = mergePriorStagesIntoJourney(journey.data, s4.data);

        // 아직 공통 기본 단계 그대로이거나, 이전 방식(개별 사건형)으로 생성된
        // 페르소나는 표준 여정 국면 형식으로 단계를 AI 생성해 교체합니다.
        const problem = ctx?.startingPoint?.trim() ?? "";
        const stageTargets = merged.subjects.filter((subject) => {
          const persona = merged.personas[subject.id];
          if (!persona) return false;
          if (!persona.stagesGeneratedAt) {
            return personaHasDefaultJourneySteps(persona);
          }
          return (
            (persona.stagesGeneratedVersion ?? 1) <
            JOURNEY_STAGES_GENERATION_VERSION
          );
        });

        let stagesReplaced = false;
        if (problem && stageTargets.length > 0) {
          try {
            const generated = await requestJourneyStageGeneration({
              projectId,
              problem,
              prePmfSummary: ctx?.contextualInsights ?? "",
              personas: stageTargets.map((subject) => ({
                subjectId: subject.id,
                name: subject.name,
                context: subject.context,
                items: Object.values(merged.itemsById)
                  .filter(
                    (item) =>
                      item.subjectId === subject.id &&
                      item.kind !== "latent_need",
                  )
                  .slice(0, 12)
                  .map((item) => ({ kind: item.kind, text: item.text })),
              })),
            });
            for (const persona of generated) {
              const next = replacePersonaJourneySteps(
                merged,
                persona.subjectId,
                persona.stages,
              );
              if (next !== merged) {
                merged = next;
                stagesReplaced = true;
              }
            }
          } catch {
            // 생성 실패 시 기본 단계 유지 — 다음 진입에서 다시 시도합니다.
          }
        }
        if (cancelled) return;

        const bootstrapped = autoPlacePoolItemsIntoJourney(merged);
        setData(bootstrapped);
        setArtifactId(journey.artifactId);
        setAllSlots(journey.allSlots);

        if (
          stagesReplaced ||
          journeyPlacementChanged(journey.data, bootstrapped)
        ) {
          const result = await saveStage6UserJourney({
            projectId,
            artifactId: journey.artifactId,
            data: bootstrapped,
            existingSlots: journey.allSlots,
          });
          if (!cancelled) {
            setArtifactId(result.artifactId);
            setLastSavedAt(formatSavedTime(new Date().toISOString()));
          }
        }

        // 진입 시 자동 AI 분석 — 아직 비어 있는 터치포인트·Pain point를
        // 페르소나별 배치 호출 한 번씩으로 채웁니다 (보드는 먼저 표시).
        const zoneTargets = collectJourneyZoneAutoFillTargets(bootstrapped);
        if (zoneTargets.length > 0) {
          setZonesAutoFilling(true);
          void (async () => {
            try {
              for (const target of zoneTargets) {
                try {
                  const results = await requestJourneyZonesAutoFill({
                    projectId,
                    subjectName: target.subjectName,
                    expectations: target.expectations,
                    steps: target.steps,
                  });
                  if (cancelled) return;
                  if (results.length > 0) {
                    setData((prev) =>
                      applyJourneyZoneAutoFill(prev, target.subjectId, results),
                    );
                  }
                } catch {
                  // 실패한 페르소나는 다음 진입에서 다시 시도합니다.
                }
              }
            } finally {
              if (!cancelled) setZonesAutoFilling(false);
            }
          })();
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

  const saveArtifact = useCallback(
    async (next: UserJourneyMapData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await saveStage6UserJourney({
          projectId,
          artifactId,
          data: next,
          existingSlots: allSlots,
        });
        setArtifactId(result.artifactId);
        setLastSavedAt(formatSavedTime(new Date().toISOString()));
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "저장에 실패했습니다.",
        );
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [projectId, artifactId, allSlots],
  );

  useDebouncedPersist({
    data,
    enabled: !loading,
    save: saveArtifact,
  });

  const handleChange = useCallback((next: UserJourneyMapData) => {
    setData(next);
  }, []);

  if (loading) {
    return (
      <p className={`${stageCaption} rounded-2xl border border-border-warm bg-panel p-6 text-center`}>
        사용자 여정 지도 그리기를 불러오는 중…
      </p>
    );
  }

  return (
    <StageContainer
      stageNumber={5}
      sceneKey={`stage-5-journey-${projectId}`}
      introCoach={
        <UserJourneyCoachPanel
          projectId={projectId}
          data={data}
          variant="intro"
        />
      }
      coach={
        <UserJourneyCoachPanel
          projectId={projectId}
          data={data}
          variant="work"
        />
      }
      work={
        <>
          <UserJourneyWorkPanel
            projectId={projectId}
            data={data}
            onChange={handleChange}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
            projectTitle={workspace?.projectTitle}
            autoFilling={zonesAutoFilling}
          />
          <div
            className={`${stagePanel} stage-workspace-nav mt-4 flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              초안 배치를 다듬은 뒤 진짜 필요 찾기로 넘어가 보세요.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={4}
              />
              <WorkspaceForwardButton
                stageId={6}
                onClick={() =>
                  router.push(`/project/${projectId}/stage/6`)
                }
              />
            </div>
          </div>
        </>
      }
    />
  );
}
