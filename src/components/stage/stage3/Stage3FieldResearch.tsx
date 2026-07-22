"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import { StageContinueGatePanel } from "@/components/stage/StageContinueGatePanel";
import { FieldResearchCoachPanel } from "@/components/stage/stage3/FieldResearchCoachPanel";
import { FieldResearchWorkPanel } from "@/components/stage/stage3/FieldResearchWorkPanel";
import { Stage3ResearchPrepWorkPanel } from "@/components/stage/stage3/Stage3ResearchPrepWorkPanel";
import {
  fetchStage3FieldResearch,
  saveStage3FieldResearch,
  touchProjectPhaseStage3,
} from "@/lib/artifacts/stage3FieldResearch";
import { DEFAULT_FIELD_RESEARCH } from "@/lib/stages/fieldResearch/defaults";
import {
  hydrateFieldResearchForProject,
  loadToKnowBuildContext,
} from "@/lib/stages/fieldResearch/stage3Bootstrap";
import { researchPrepTargetLabels } from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import { isToKnowDiscoveryActive } from "@/lib/stages/fieldResearch/stage3ToKnowPrepFlow";
import { fetchStage2PrePmf } from "@/lib/artifacts/stage2PrePmf";
import { useArchiveView } from "@/lib/archive/archiveViewContext";
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
  const archiveView = useArchiveView();
  const [data, setData] = useState<FieldResearchData>(DEFAULT_FIELD_RESEARCH);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingDiscoveryData, setPendingDiscoveryData] =
    useState<FieldResearchData | null>(null);
  const [prepContext, setPrepContext] = useState<{
    problem: string;
    prePmfSummary: string;
    targetLabels: string[];
  }>({ problem: "", prePmfSummary: "", targetLabels: [] });
  const discoveryConversationActive = isToKnowDiscoveryActive(data.toKnowPrep);
  const showResearchPrepPhase =
    !archiveView && data.prepWorkflowPhase === "research_prep";
  const showDiscoveryScreen =
    !archiveView &&
    !showResearchPrepPhase &&
    (discoveryConversationActive || pendingDiscoveryData !== null);
  useWorkspaceScrollOnEnter(
    showDiscoveryScreen ? "discovery" : showResearchPrepPhase ? "work" : "work",
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchStage3FieldResearch(projectId);
        if (cancelled) return;
        const next = await hydrateFieldResearchForProject(
          projectId,
          result.data,
        );
        setData(next);
        setArtifactId(result.artifactId);
        const [ctx, s2] = await Promise.all([
          loadToKnowBuildContext(projectId),
          fetchStage2PrePmf(projectId),
        ]);
        setPrepContext({
          problem: ctx.startingPoint,
          prePmfSummary: ctx.contextualInsights ?? "",
          targetLabels: researchPrepTargetLabels(s2.data),
        });
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

  const handleBackToResearchPrep = useCallback(() => {
    setData((prev) => ({ ...prev, prepWorkflowPhase: "research_prep" }));
  }, []);

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
      sceneKey={`stage-3-field-${projectId}-${data.prepWorkflowPhase}`}
      work={
        showResearchPrepPhase ? (
          <Stage3ResearchPrepWorkPanel
            projectId={projectId}
            data={data}
            onChange={setData}
            onContinue={handleContinue}
            problem={prepContext.problem}
            prePmfSummary={prepContext.prePmfSummary}
            targetLabels={prepContext.targetLabels}
            editable={!archiveView}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
        ) : (
          <FieldResearchWorkPanel
            projectId={projectId}
            data={data}
            onChange={setData}
            onContinue={handleContinue}
            onBackToResearchPrep={handleBackToResearchPrep}
            saving={saving}
            saveError={saveError}
            lastSavedAt={lastSavedAt}
          />
        )
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
