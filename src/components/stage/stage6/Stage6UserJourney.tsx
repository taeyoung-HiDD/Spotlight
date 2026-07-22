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
import {
  bootstrapJourneyOnEntry,
  journeyPlacementChanged,
} from "@/lib/stages/stage6/bootstrapJourneyFromPriorStages";
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
  const workspace = useOptionalProjectWorkspace();
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
        const [journey, s4] = await Promise.all([
          fetchStage6UserJourney(projectId),
          fetchStage4Discoveries(projectId),
        ]);
        if (cancelled) return;

        const bootstrapped = bootstrapJourneyOnEntry(journey.data, s4.data);
        setData(bootstrapped);
        setArtifactId(journey.artifactId);
        setAllSlots(journey.allSlots);

        if (journeyPlacementChanged(journey.data, bootstrapped)) {
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
