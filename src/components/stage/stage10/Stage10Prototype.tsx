"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { PrototypeCoachPanel } from "@/components/stage/stage10/PrototypeCoachPanel";
import { PrototypeWorkPanel } from "@/components/stage/stage10/PrototypeWorkPanel";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import { fetchStage9ConceptSheet } from "@/lib/artifacts/stage9ConceptSheet";
import {
  fetchStage10Prototype,
  saveStage10Prototype,
} from "@/lib/artifacts/stage10Prototype";
import {
  defaultConceptSheet,
  type ConceptSheetData,
} from "@/lib/stages/stage9/conceptSheetTypes";
import {
  defaultPrototype,
  type PrototypeData,
} from "@/lib/stages/stage10/prototypeTypes";
import type { ArtifactSlots } from "@/types/database";
import { stageCaption, stagePanel } from "@/lib/stages/ui";

interface Stage10PrototypeProps {
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

export function Stage10Prototype({ projectId }: Stage10PrototypeProps) {
  const router = useRouter();
  const [concept, setConcept] = useState<ConceptSheetData>(defaultConceptSheet());
  const [data, setData] = useState<PrototypeData>(defaultPrototype());
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
        const [proto, conceptSheet] = await Promise.all([
          fetchStage10Prototype(projectId),
          fetchStage9ConceptSheet(projectId),
        ]);
        if (cancelled) return;
        setData(proto.data);
        setArtifactId(proto.artifactId);
        setAllSlots(proto.allSlots);
        setConcept(conceptSheet.data);
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
    async (next: PrototypeData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await saveStage10Prototype({
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

  const handleChange = useCallback((next: PrototypeData) => {
    setData(next);
  }, []);

  if (loading) {
    return (
      <p
        className={`${stageCaption} rounded-2xl border border-border-warm bg-panel p-6 text-center`}
      >
        시제품 만들기를 불러오는 중…
      </p>
    );
  }

  return (
    <StageContainer
      stageNumber={11}
      sceneKey={`stage-10-prototype-${projectId}`}
      introCoach={
        <PrototypeCoachPanel
          projectId={projectId}
          concept={concept}
          data={data}
          variant="intro"
        />
      }
      coach={
        <PrototypeCoachPanel
          projectId={projectId}
          concept={concept}
          data={data}
          variant="work"
        />
      }
      work={
        <>
          <PrototypeWorkPanel
            projectId={projectId}
            concept={concept}
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
              시제품 흐름을 확인한 뒤 테스트로 검증 단계로 넘어가 보세요.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={10}
              />
              <WorkspaceForwardButton
                stageId={12}
                onClick={() =>
                  router.push(`/project/${projectId}/stage/12`)
                }
              />
            </div>
          </div>
        </>
      }
    />
  );
}
