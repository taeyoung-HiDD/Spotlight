"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { ConceptSheetCoachPanel } from "@/components/stage/stage9/ConceptSheetCoachPanel";
import { ConceptSheetWorkPanel } from "@/components/stage/stage9/ConceptSheetWorkPanel";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import { fetchStage5LatentNeeds } from "@/lib/artifacts/stage5LatentNeeds";
import {
  fetchStage9ConceptSheet,
  saveStage9ConceptSheet,
} from "@/lib/artifacts/stage9ConceptSheet";
import { mergePriorStagesIntoConcept } from "@/lib/stages/stage9/bootstrapConceptFromPriorStages";
import {
  defaultConceptSheet,
  type ConceptSheetData,
} from "@/lib/stages/stage9/conceptSheetTypes";
import type { ArtifactSlots } from "@/types/database";
import { stageCaption, stagePanel } from "@/lib/stages/ui";

interface Stage9ConceptSheetProps {
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

export function Stage9ConceptSheet({ projectId }: Stage9ConceptSheetProps) {
  const router = useRouter();
  const [data, setData] = useState<ConceptSheetData>(defaultConceptSheet());
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
        const [concept, s5] = await Promise.all([
          fetchStage9ConceptSheet(projectId),
          fetchStage5LatentNeeds(projectId),
        ]);
        if (cancelled) return;
        const merged = mergePriorStagesIntoConcept(
          concept.artifactId ? concept.data : defaultConceptSheet(),
          s5.data,
        );
        setData(merged);
        setArtifactId(concept.artifactId);
        setAllSlots(concept.allSlots);
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
    async (next: ConceptSheetData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await saveStage9ConceptSheet({
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

  const handleChange = useCallback((next: ConceptSheetData) => {
    setData(next);
  }, []);

  if (loading) {
    return (
      <p
        className={`${stageCaption} rounded-2xl border border-border-warm bg-panel p-6 text-center`}
      >
        컨셉 시트를 불러오는 중…
      </p>
    );
  }

  return (
    <StageContainer
      stageNumber={10}
      sceneKey={`stage-9-concept-${projectId}`}
      introCoach={
        <ConceptSheetCoachPanel
          projectId={projectId}
          data={data}
          variant="intro"
        />
      }
      coach={
        <ConceptSheetCoachPanel
          projectId={projectId}
          data={data}
          variant="work"
        />
      }
      work={
        <>
          <ConceptSheetWorkPanel
            projectId={projectId}
            data={data}
            onChange={handleChange}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
          <div
            className={`${stagePanel} stage-workspace-nav mt-4 flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              스토리보드까지 마치면 시제품 만들기로 넘어가 보세요.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={9}
              />
              <WorkspaceForwardButton
                stageId={11}
                onClick={() =>
                  router.push(`/project/${projectId}/stage/11`)
                }
              />
            </div>
          </div>
        </>
      }
    />
  );
}
