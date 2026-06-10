"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { UserJourneyCoachPanel } from "@/components/stage/stage6/UserJourneyCoachPanel";
import { UserJourneyWorkPanel } from "@/components/stage/stage6/UserJourneyWorkPanel";
import { fetchStage4Discoveries } from "@/lib/artifacts/stage4Discoveries";
import { fetchStage5LatentNeeds } from "@/lib/artifacts/stage5LatentNeeds";
import {
  fetchStage6UserJourney,
  saveStage6UserJourney,
} from "@/lib/artifacts/stage6UserJourney";
import { mergePriorStagesIntoJourney } from "@/lib/stages/stage6/bootstrapJourneyFromPriorStages";
import {
  defaultUserJourneyMap,
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
  const [data, setData] = useState<UserJourneyMapData>(defaultUserJourneyMap());
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<ArtifactSlots>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [journey, s4, s5] = await Promise.all([
          fetchStage6UserJourney(projectId),
          fetchStage4Discoveries(projectId),
          fetchStage5LatentNeeds(projectId),
        ]);
        if (cancelled) return;
        const merged = mergePriorStagesIntoJourney(
          journey.data,
          s4.data,
          s5.data,
        );
        setData(merged);
        setArtifactId(journey.artifactId);
        setAllSlots(journey.allSlots);
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
      stageNumber={6}
      sceneKey={`stage-6-journey-${projectId}`}
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
            data={data}
            onChange={handleChange}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
          <div
            className={`${stagePanel} mt-4 flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              조사·니즈 배치를 마친 뒤 아이디어 만들기로 넘어가 보세요.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={5}
              />
              <WorkspaceForwardButton
                stageId={7}
                onClick={() =>
                  router.push(`/project/${projectId}/stage/7`)
                }
              />
            </div>
          </div>
        </>
      }
    />
  );
}
