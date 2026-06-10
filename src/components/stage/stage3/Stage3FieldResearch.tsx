"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import { StageContinueGatePanel } from "@/components/stage/StageContinueGatePanel";
import { FieldResearchCoachPanel } from "@/components/stage/stage3/FieldResearchCoachPanel";
import { FieldResearchWorkPanel } from "@/components/stage/stage3/FieldResearchWorkPanel";
import {
  fetchStage3FieldResearch,
  saveStage3FieldResearch,
  touchProjectPhaseStage3,
} from "@/lib/artifacts/stage3FieldResearch";
import { DEFAULT_FIELD_RESEARCH } from "@/lib/stages/fieldResearch/defaults";
import { bootstrapFieldResearchForProject } from "@/lib/stages/fieldResearch/stage3Bootstrap";
import { isToKnowDiscoveryActive } from "@/lib/stages/fieldResearch/stage3ToKnowPrepFlow";
import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import { useWorkspaceScrollOnEnter } from "@/lib/motion/pageEnterScroll";
import {
  stageCoachComposerShell,
  stageIntroEnterWork,
  stageIntroShell,
} from "@/lib/stages/ui";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";

interface Stage3FieldResearchProps {
  projectId: string;
}

function formatSavedTime() {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}

export function Stage3FieldResearch({ projectId }: Stage3FieldResearchProps) {
  const router = useRouter();
  const [data, setData] = useState<FieldResearchData>(DEFAULT_FIELD_RESEARCH);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingDiscoveryData, setPendingDiscoveryData] =
    useState<FieldResearchData | null>(null);
  const discoveryConversationActive = isToKnowDiscoveryActive(data.toKnowPrep);
  const showDiscoveryScreen =
    discoveryConversationActive || pendingDiscoveryData !== null;
  useWorkspaceScrollOnEnter(showDiscoveryScreen ? "discovery" : "work");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchStage3FieldResearch(projectId);
        if (cancelled) return;
        let next = result.data;
        if (!next.toKnowTable.length) {
          next = await bootstrapFieldResearchForProject(projectId, next);
        }
        setData(next);
        setArtifactId(result.artifactId);
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
    async (next: FieldResearchData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const { artifactId: id } = await saveStage3FieldResearch({
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
    [artifactId, projectId],
  );

  const { flush: flushSave } = useDebouncedPersist({
    data,
    enabled: !loading,
    save: saveArtifact,
  });

  const persistNow = useCallback(
    async (next: FieldResearchData = data): Promise<boolean> => {
      try {
        await flushSave(next);
        setData(next);
        return true;
      } catch {
        return false;
      }
    },
    [data, flushSave],
  );

  const handleContinue = useCallback(async () => {
    const ok = await persistNow(data);
    if (!ok) return;
    await touchProjectPhaseStage3(projectId);
    router.push(`/project/${projectId}/stage/4`);
  }, [data, persistNow, projectId, router]);

  const handleDiscoveryGateContinue = useCallback(() => {
    if (!pendingDiscoveryData) return;
    void persistNow(pendingDiscoveryData);
    setPendingDiscoveryData(null);
  }, [pendingDiscoveryData, persistNow]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-warm bg-white px-6 py-12 text-center text-[16px] text-muted">
        사용자 조사 준비 자료를 불러오는 중…
      </div>
    );
  }

  if (showDiscoveryScreen) {
    return (
      <StageRevealGroup>
        <div key="discovery" className="coach-page-enter">
        <div className={stageIntroShell}>
          <div className={stageIntroEnterWork}>
            <FieldResearchCoachPanel
              projectId={projectId}
              data={data}
              onDataChange={setData}
              onDiscoveryComplete={setPendingDiscoveryData}
              discoveryGatePending={pendingDiscoveryData !== null}
              footer={
                pendingDiscoveryData ? (
                  <div className={stageCoachComposerShell}>
                    <StageContinueGatePanel
                      caption="조사 맥락을 모았어요. To-know 표 화면에서 질문을 다듬어 볼게요."
                      onContinue={handleDiscoveryGateContinue}
                    />
                  </div>
                ) : null
              }
            />
          </div>
        </div>
        </div>
      </StageRevealGroup>
    );
  }

  return (
    <div key="work" className="coach-page-enter">
    <StageContainer
      stageNumber={3}
      sceneKey={`stage-3-field-${projectId}`}
      work={
        <FieldResearchWorkPanel
          projectId={projectId}
          data={data}
          onChange={setData}
          onContinue={handleContinue}
          saving={saving}
          saveError={saveError}
          lastSavedAt={lastSavedAt}
        />
      }
      coach={
        <FieldResearchCoachPanel
          projectId={projectId}
          data={data}
          onDataChange={setData}
        />
      }
    />
    </div>
  );
}
