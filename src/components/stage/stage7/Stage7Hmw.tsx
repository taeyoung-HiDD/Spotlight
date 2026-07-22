"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { HmwCoachPanel } from "@/components/stage/stage7/HmwCoachPanel";
import { HmwWorkPanel } from "@/components/stage/stage7/HmwWorkPanel";
import { fetchStage5LatentNeeds } from "@/lib/artifacts/stage5LatentNeeds";
import {
  fetchStage7Hmw,
  saveStage7Hmw,
} from "@/lib/artifacts/stage7Hmw";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import {
  bootstrapHmwOnEntry,
  hmwDataChanged,
} from "@/lib/stages/stage7/bootstrapHmwFromStage5";
import {
  applyGeneratedHmw,
  buildHmwGenerationInputs,
  requestHmwGeneration,
} from "@/lib/stages/stage7/generateHmwClient";
import {
  defaultStage7Hmw,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import type { ArtifactSlots } from "@/types/database";
import { stageCaption, stagePanel } from "@/lib/stages/ui";

interface Stage7HmwProps {
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

export function Stage7Hmw({ projectId }: Stage7HmwProps) {
  const router = useRouter();
  const [data, setData] = useState<Stage7HmwData>(defaultStage7Hmw());
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [allSlots, setAllSlots] = useState<ArtifactSlots>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [hmwResult, stage5] = await Promise.all([
          fetchStage7Hmw(projectId),
          fetchStage5LatentNeeds(projectId),
        ]);
        if (cancelled) return;

        const merged = await bootstrapHmwOnEntry(
          hmwResult.data,
          stage5.data,
          projectId,
        );
        if (cancelled) return;

        setData(merged);
        setArtifactId(hmwResult.artifactId);
        setAllSlots(hmwResult.allSlots);

        if (merged.questions.length > 0 && hmwDataChanged(hmwResult.data, merged)) {
          const { artifactId: syncedId } = await saveStage7Hmw({
            projectId,
            artifactId: hmwResult.artifactId,
            data: merged,
            existingSlots: hmwResult.allSlots,
          });
          if (!cancelled) {
            setArtifactId(syncedId);
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
    async (next: Stage7HmwData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await saveStage7Hmw({
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

  const handleChange = useCallback((next: Stage7HmwData) => {
    setData(next);
  }, []);

  const handleGenerate = useCallback(async () => {
    const inputs = buildHmwGenerationInputs(data);
    if (inputs.length === 0) return;

    setGenerating(true);
    setSaveError(null);
    try {
      const response = await requestHmwGeneration(projectId, inputs);
      const next = applyGeneratedHmw(data, response.items);
      setData(next);
      await saveArtifact(next);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "HMW 초안 생성에 실패했습니다.",
      );
    } finally {
      setGenerating(false);
    }
  }, [data, projectId, saveArtifact]);

  if (loading) {
    return (
      <p
        className={`${stageCaption} rounded-2xl border border-border-warm bg-panel p-6 text-center`}
      >
        HMW 질문 만들기를 불러오는 중…
      </p>
    );
  }

  return (
    <StageContainer
      stageNumber={7}
      sceneKey={`stage-7-hmw-${projectId}`}
      introCoach={
        <HmwCoachPanel projectId={projectId} data={data} variant="intro" />
      }
      coach={
        <HmwCoachPanel projectId={projectId} data={data} variant="work" />
      }
      work={
        <>
          <HmwWorkPanel
            projectId={projectId}
            data={data}
            onChange={handleChange}
            generating={generating}
            onGenerate={handleGenerate}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
          <div
            className={`${stagePanel} stage-workspace-nav mt-4 flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              HMW 질문을 채운 뒤 아이디어 펼치기로 넘어가 보세요.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={6}
              />
              <WorkspaceForwardButton
                stageId={8}
                onClick={() =>
                  router.push(`/project/${projectId}/stage/8`)
                }
              />
            </div>
          </div>
        </>
      }
    />
  );
}
