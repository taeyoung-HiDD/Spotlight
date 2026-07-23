"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { LatentNeedsCoachPanel } from "@/components/stage/stage5/LatentNeedsCoachPanel";
import { LatentNeedsWorkPanel } from "@/components/stage/stage5/LatentNeedsWorkPanel";
import { withBootstrappedJourneyNeeds } from "@/components/stage/stage5/LatentNeedsJourneyBoard";
import { getStagePageName } from "@/lib/navigation/stageNavLabels";import { fetchStage4Discoveries } from "@/lib/artifacts/stage4Discoveries";
import {
  fetchStage5LatentNeeds,
  saveStage5LatentNeeds,
} from "@/lib/artifacts/stage5LatentNeeds";
import { fetchStage6UserJourney } from "@/lib/artifacts/stage6UserJourney";
import { touchProjectPhase } from "@/lib/artifacts/stage5Iceberg";
import {
  isStage5SourcePostitKind,
  mergeStage4DiscoveriesIntoLatentNeeds,
  stage4HasResearchContent,
} from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import {
  applyGeneratedLatentNeeds,
  buildSourceInputsFromBoard,
  requestLatentNeedsGeneration,
} from "@/lib/stages/stage5/generateLatentNeedsClient";
import {
  defaultStage5LatentNeeds,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { setNeedsWorkflowPhase } from "@/lib/stages/stage5/latentNeedsGroups";
import {
  defaultUserJourneyMap,
  type UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
import type { ArtifactSlots } from "@/types/database";
import { stageCaption, stagePanel } from "@/lib/stages/ui";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";

interface Stage5IcebergProps {
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

function hasSourceNotes(data: Stage5LatentNeedsData): boolean {
  return data.postits.some(
    (p) => isStage5SourcePostitKind(p.kind) && p.text.trim(),
  );
}

export function Stage5Iceberg({ projectId }: Stage5IcebergProps) {
  const router = useRouter();
  const [data, setData] = useState<Stage5LatentNeedsData>(
    defaultStage5LatentNeeds(),
  );
  const [journey, setJourney] = useState<UserJourneyMapData>(
    defaultUserJourneyMap(),
  );
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<ArtifactSlots>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const bootstrapRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    bootstrapRef.current = false;
    (async () => {
      try {
        const [needsResult, stage4, journeyResult] = await Promise.all([
          fetchStage5LatentNeeds(projectId),
          fetchStage4Discoveries(projectId),
          fetchStage6UserJourney(projectId),
        ]);
        if (cancelled) return;

        let next = needsResult.data;
        const stage4Data = stage4.data;
        const shouldSyncStage4 = stage4HasResearchContent(stage4Data);
        const journeyData = journeyResult.data;

        if (shouldSyncStage4) {
          next = mergeStage4DiscoveriesIntoLatentNeeds(next, stage4Data);
        }

        next = withBootstrappedJourneyNeeds(next, journeyData);

        setData(next);
        setJourney(journeyData);
        setArtifactId(needsResult.artifactId);
        setAllSlots(needsResult.allSlots);

        const needsKevin =
          !next.kevinGeneratedAt &&
          hasSourceNotes(next) &&
          !next.postits.some((p) => p.kind === "latent_need");

        if (shouldSyncStage4 && !needsKevin) {
          const { artifactId: syncedId } = await saveStage5LatentNeeds({
            projectId,
            artifactId: needsResult.artifactId,
            data: next,
            existingSlots: needsResult.allSlots,
          });
          if (!cancelled) {
            setArtifactId(syncedId);
            setLastSavedAt(formatSavedTime(new Date().toISOString()));
          }
        }

        if (needsKevin && !bootstrapRef.current) {
          bootstrapRef.current = true;
          setGenerating(true);
          try {
            const inputs = buildSourceInputsFromBoard(next);
            const result = await requestLatentNeedsGeneration(
              projectId,
              inputs,
            );
            if (!cancelled) {
              const withNeeds = withBootstrappedJourneyNeeds(
                applyGeneratedLatentNeeds(next, result),
                journeyData,
              );
              setData(withNeeds);
              const { artifactId: id } = await saveStage5LatentNeeds({
                projectId,
                artifactId: needsResult.artifactId,
                data: withNeeds,
                existingSlots: needsResult.allSlots,
              });
              if (!cancelled) {
                setArtifactId(id);
                setLastSavedAt(formatSavedTime(new Date().toISOString()));
              }
            }
          } catch (e) {
            if (!cancelled) {
              setSaveError(
                e instanceof Error
                  ? e.message
                  : "잠재 니즈 생성에 실패했습니다.",
              );
            }
          } finally {
            if (!cancelled) setGenerating(false);
          }
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
    async (next: Stage5LatentNeedsData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const { artifactId: id } = await saveStage5LatentNeeds({
          projectId,
          artifactId,
          data: next,
          existingSlots: allSlots,
        });
        setArtifactId(id);
        setLastSavedAt(formatSavedTime(new Date().toISOString()));
        await touchProjectPhase(projectId);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [allSlots, artifactId, projectId],
  );

  useDebouncedPersist({
    data,
    enabled: !loading && !generating,
    save: saveArtifact,
  });

  const handleDataChange = useCallback((next: Stage5LatentNeedsData) => {
    setData(next);
  }, []);

  const handleJourneyChange = useCallback((next: UserJourneyMapData) => {
    setJourney(next);
  }, []);

  const handleGenerateLatentNeeds = useCallback(async () => {
    const inputs = buildSourceInputsFromBoard(data);
    if (inputs.length === 0) {
      setSaveError("잠재 니즈를 만들 조사 결과 포스트잇이 없어요.");
      return;
    }

    setGenerating(true);
    setSaveError(null);
    try {
      const result = await requestLatentNeedsGeneration(projectId, inputs);
      const withNeeds = withBootstrappedJourneyNeeds(
        applyGeneratedLatentNeeds(data, result),
        journey,
      );
      setData(withNeeds);
      const { artifactId: id } = await saveStage5LatentNeeds({
        projectId,
        artifactId,
        data: withNeeds,
        existingSlots: allSlots,
      });
      setArtifactId(id);
      setLastSavedAt(formatSavedTime(new Date().toISOString()));
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "잠재 니즈 생성에 실패했습니다.",
      );
    } finally {
      setGenerating(false);
    }
  }, [allSlots, artifactId, data, journey, projectId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-warm bg-white px-6 py-12 text-center text-[16px] text-muted">
        자료를 불러오는 중…
      </div>
    );
  }

  const sceneKey = `stage-6-needs-${projectId}`;

  return (
    <StageContainer
      stageNumber={6}
      sceneKey={sceneKey}
      introCoach={
        <LatentNeedsCoachPanel
          projectId={projectId}
          data={data}
          variant="intro"
        />
      }
      coach={
        <LatentNeedsCoachPanel
          projectId={projectId}
          data={data}
          variant="work"
        />
      }
      work={
        <>
          <LatentNeedsWorkPanel
            projectId={projectId}
            journey={journey}
            onJourneyChange={handleJourneyChange}
            data={data}
            onChange={handleDataChange}
            onGenerate={handleGenerateLatentNeeds}
            generating={generating}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
          <div
            className={`${stagePanel} stage-workspace-nav mt-4 flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              {data.workflowPhase === "needs_categorization"
                ? "그룹으로 정리한 뒤 HMW 질문 만들기로 넘어가 보세요."
                : "잠재 니즈를 배치한 뒤, 니즈 분류하기로 묶어 보세요."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={5}
                backPageName={getStagePageName(5)}
              />
              {data.workflowPhase === "needs_categorization" ? (
                <WorkspaceForwardButton
                  stageId={7}
                  onClick={() =>
                    router.push(`/project/${projectId}/stage/7`)
                  }
                />
              ) : (
                <WorkspaceForwardButton
                  pageName="니즈 분류하기"
                  onClick={() =>
                    handleDataChange(
                      setNeedsWorkflowPhase(
                        data,
                        "needs_categorization",
                        journey,
                      ),
                    )
                  }
                />
              )}
            </div>
          </div>
        </>
      }
    />
  );
}
