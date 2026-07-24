"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { IdeaGridCoachPanel } from "@/components/stage/stage8/IdeaGridCoachPanel";
import { IdeaGridWorkPanel } from "@/components/stage/stage8/IdeaGridWorkPanel";
import {
  fetchStage8IdeaGrid,
  saveStage8IdeaGrid,
} from "@/lib/artifacts/stage8IdeaGrid";
import { fetchStage7Hmw, saveStage7Hmw } from "@/lib/artifacts/stage7Hmw";
import {
  fetchStage5LatentNeeds,
  saveStage5LatentNeeds,
} from "@/lib/artifacts/stage5LatentNeeds";
import { mergeStage5IntoHmw } from "@/lib/stages/stage7/bootstrapHmwFromStage5";
import { requestHmwGeneration } from "@/lib/stages/stage7/generateHmwClient";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import {
  defaultIdeaGrid,
  type IdeaGridData,
} from "@/lib/stages/stage8/ideaGridTypes";
import { bootstrapIdeaGridFromHmw } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import {
  appendGeneratedHmwToGrid,
  findNextQuadrantToPull,
  prepareHmwQuestionsForNeeds,
  usedLatentNeedIds,
} from "@/lib/stages/stage8/pullNextQuadrantHmw";
import {
  defaultStage7Hmw,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import {
  defaultStage5LatentNeeds,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import type { ArtifactSlots } from "@/types/database";
import { stageCaption, stagePanel } from "@/lib/stages/ui";

interface Stage8IdeationProps {
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

export function Stage8Ideation({ projectId }: Stage8IdeationProps) {
  const router = useRouter();
  const [data, setData] = useState<IdeaGridData>(defaultIdeaGrid());
  const [hmwData, setHmwData] = useState<Stage7HmwData>(defaultStage7Hmw());
  const [stage5Data, setStage5Data] = useState<Stage5LatentNeedsData>(
    defaultStage5LatentNeeds(),
  );
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [hmwArtifactId, setHmwArtifactId] = useState<string | null>(null);
  const [stage5ArtifactId, setStage5ArtifactId] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<ArtifactSlots>({});
  const [hmwAllSlots, setHmwAllSlots] = useState<ArtifactSlots>({});
  const [stage5AllSlots, setStage5AllSlots] = useState<ArtifactSlots>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pullingQuadrant, setPullingQuadrant] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [grid, hmw, stage5] = await Promise.all([
          fetchStage8IdeaGrid(projectId),
          fetchStage7Hmw(projectId),
          fetchStage5LatentNeeds(projectId),
        ]);
        if (cancelled) return;
        const mergedHmw = mergeStage5IntoHmw(hmw.data, stage5.data);
        const bootstrapped = bootstrapIdeaGridFromHmw(grid.data, mergedHmw);
        setData(bootstrapped);
        setHmwData(mergedHmw);
        setStage5Data(stage5.data);
        setArtifactId(grid.artifactId);
        setHmwArtifactId(hmw.artifactId);
        setStage5ArtifactId(stage5.artifactId);
        setAllSlots(grid.allSlots);
        setHmwAllSlots(hmw.allSlots);
        setStage5AllSlots(stage5.allSlots);

        const gridChanged =
          bootstrapped.hmwSyncedAt !== grid.data.hmwSyncedAt ||
          bootstrapped.cellHmwIds.join("|") !== grid.data.cellHmwIds.join("|") ||
          bootstrapped.activeView !== grid.data.activeView;

        if (gridChanged) {
          try {
            const { artifactId: syncedId } = await saveStage8IdeaGrid({
              projectId,
              artifactId: grid.artifactId,
              data: bootstrapped,
              existingSlots: grid.allSlots,
            });
            if (!cancelled) setArtifactId(syncedId);
          } catch (e) {
            if (!cancelled) {
              setSaveError(
                e instanceof Error ? e.message : "HMW 연결 저장에 실패했습니다.",
              );
            }
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
    async (next: IdeaGridData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await saveStage8IdeaGrid({
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

  const handleSaveNeedHmw = useCallback(
    async (result: {
      grid: IdeaGridData;
      hmw: Stage7HmwData;
      stage5: Stage5LatentNeedsData;
    }) => {
      setSaving(true);
      setSaveError(null);
      try {
        const syncedGrid = bootstrapIdeaGridFromHmw(result.grid, result.hmw);
        const [gridResult, hmwResult, stage5Result] = await Promise.all([
          saveStage8IdeaGrid({
            projectId,
            artifactId,
            data: syncedGrid,
            existingSlots: allSlots,
          }),
          saveStage7Hmw({
            projectId,
            artifactId: hmwArtifactId,
            data: result.hmw,
            existingSlots: hmwAllSlots,
          }),
          saveStage5LatentNeeds({
            projectId,
            artifactId: stage5ArtifactId,
            data: result.stage5,
            existingSlots: stage5AllSlots,
          }),
        ]);
        setData(syncedGrid);
        setHmwData(result.hmw);
        setStage5Data(result.stage5);
        setArtifactId(gridResult.artifactId);
        setHmwArtifactId(hmwResult.artifactId);
        setStage5ArtifactId(stage5Result.artifactId);
        setLastSavedAt(formatSavedTime(new Date().toISOString()));
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "니즈·HMW 저장에 실패했습니다.",
        );
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [
      projectId,
      artifactId,
      hmwArtifactId,
      stage5ArtifactId,
      allSlots,
      hmwAllSlots,
      stage5AllSlots,
    ],
  );

  const handlePullNextQuadrant = useCallback(async () => {
    const next = findNextQuadrantToPull(
      stage5Data,
      usedLatentNeedIds(hmwData),
    );
    if (!next) {
      setSaveError("더 꺼낼 사분면 니즈가 없어요.");
      return;
    }

    setPullingQuadrant(true);
    setSaveError(null);
    try {
      const preparedHmw = prepareHmwQuestionsForNeeds(hmwData, next.needs);

      const inputs = preparedHmw.questions
        .filter(
          (q) =>
            next.needs.some((n) => n.id === q.latentNeedId) &&
            q.latentNeedText.trim() &&
            !q.hmwText.trim(),
        )
        .map((q) => ({
          questionId: q.id,
          latentNeedText: q.latentNeedText,
        }));

      let generatedItems:
        | Awaited<ReturnType<typeof requestHmwGeneration>>["items"]
        | undefined;
      try {
        if (inputs.length > 0) {
          const response = await requestHmwGeneration(projectId, inputs);
          generatedItems = response.items;
        }
      } catch {
        generatedItems = undefined;
      }

      const result = appendGeneratedHmwToGrid({
        grid: data,
        hmw: preparedHmw,
        needs: next.needs,
        generatedItems,
      });
      const syncedGrid = bootstrapIdeaGridFromHmw(result.grid, result.hmw);

      const [gridResult, hmwResult] = await Promise.all([
        saveStage8IdeaGrid({
          projectId,
          artifactId,
          data: syncedGrid,
          existingSlots: allSlots,
        }),
        saveStage7Hmw({
          projectId,
          artifactId: hmwArtifactId,
          data: result.hmw,
          existingSlots: hmwAllSlots,
        }),
      ]);
      setData(syncedGrid);
      setHmwData(result.hmw);
      setArtifactId(gridResult.artifactId);
      setHmwArtifactId(hmwResult.artifactId);
      setLastSavedAt(formatSavedTime(new Date().toISOString()));
    } catch (e) {
      setSaveError(
        e instanceof Error
          ? e.message
          : "다음 사분면 HMW를 가져오지 못했습니다.",
      );
    } finally {
      setPullingQuadrant(false);
    }
  }, [
    allSlots,
    artifactId,
    data,
    hmwAllSlots,
    hmwArtifactId,
    hmwData,
    projectId,
    stage5Data,
  ]);

  const handleChange = useCallback((next: IdeaGridData) => {
    setData(next);
  }, []);

  const hmwQuestions = hmwData.questions.filter((q) => q.hmwText.trim());

  if (loading) {
    return (
      <p
        className={`${stageCaption} rounded-2xl border border-border-warm bg-panel p-6 text-center`}
      >
        아이디어 펼치기를 불러오는 중…
      </p>
    );
  }

  return (
    <StageContainer
      stageNumber={8}
      sceneKey={`stage-8-ideation-${projectId}`}
      introCoach={
        <IdeaGridCoachPanel
          projectId={projectId}
          data={data}
          hmwQuestions={hmwQuestions}
          variant="intro"
        />
      }
      coach={
        <IdeaGridCoachPanel
          projectId={projectId}
          data={data}
          hmwQuestions={hmwQuestions}
          variant="work"
        />
      }
      work={
        <>
          <IdeaGridWorkPanel
            projectId={projectId}
            data={data}
            hmwData={hmwData}
            stage5Data={stage5Data}
            onChange={handleChange}
            onSaveNeedHmw={handleSaveNeedHmw}
            onPullNextQuadrant={handlePullNextQuadrant}
            pullingQuadrant={pullingQuadrant}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
          <div
            className={`${stagePanel} stage-workspace-nav mt-4 flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              아이디어를 펼친 뒤 우선순위 정하기로 넘어가 보세요.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={7}
              />
              <WorkspaceForwardButton
                stageId={9}
                onClick={() =>
                  router.push(`/project/${projectId}/stage/9`)
                }
              />
            </div>
          </div>
        </>
      }
    />
  );
}
