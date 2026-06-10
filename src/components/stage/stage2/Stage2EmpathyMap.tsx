"use client";

import { useRouter } from "next/navigation";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import { StageContinueGatePanel } from "@/components/stage/StageContinueGatePanel";
import { StageTwoColumnLayout } from "@/components/stage/StageTwoColumnLayout";
import { ContextualPurposeGuide } from "@/components/stage/stage2/ContextualPurposeGuide";
import { ContextualResearchCanvas } from "@/components/stage/stage2/ContextualResearchCanvas";
import { StageWorkDiscoveryPlaceholder } from "@/components/stage/StageWorkDiscoveryPlaceholder";
import {
  fetchStage2EmpathyMap,
  saveStage2EmpathyMap,
} from "@/lib/artifacts/stage2EmpathyMap";
import {
  sendCoachChat,
  stageChatTitle,
  type CoachChatHistoryItem,
} from "@/lib/coach/chatClient";
import {
  formatInputGuideForContext,
  getStageWorkInputGuide,
} from "@/lib/coach/inputGuidance";
import { useWorkspaceScrollOnEnter } from "@/lib/motion/pageEnterScroll";
import { buildContextualDiscoveryIntroMessages } from "@/lib/stages/stage2/contextualDiscovery";
import {
  appendContextualCoachNote,
  buildContextualSummary,
  buildResearchCoachKickoff,
  defaultContextualPrep,
  deriveToKnowFromContextual,
  getContextualIntroInputGuide,
  getContextualRefineInputGuide,
  isContextualIntroActive,
  isContextualResearchActive,
} from "@/lib/stages/stage2/contextualDiscoveryFlow";
import {
  formatAnswerList,
  mergeAnswerItems,
} from "@/lib/stages/stage2/contextualAnswers";
import {
  applyContextualAnswerPatch,
  contextualEditModeFromUser,
  parseContextualCoachEdit,
  parseContextualUserEdit,
  STAGE2_INTRO_CHAT_HINT,
  STAGE2_RESEARCH_CHAT_HINT,
  stripContextualEditMetaLine,
} from "@/lib/stages/stage2/parseContextualCoachEdit";
import {
  buildArtifactPatchAfterAutoResearch,
  planAutoResearch,
  runAutoContextualResearch,
} from "@/lib/stages/stage2/contextualAutoResearch";
import { emptyContextualDimensionResearch } from "@/lib/stages/stage2/contextualDimensionResearch";
import {
  CONTEXTUAL_DIMENSIONS,
  getDimensionDef,
  type ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import { emptyEmpathyMapQuadrants, type EmpathyMapData } from "@/lib/stages/stage2/empathyMap";
import { resolveStage1StartingPoint } from "@/lib/stages/stage1/resolveStartingPoint";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import {
  stageCaption,
  stagePanel,
} from "@/lib/stages/ui";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";

interface Stage2EmpathyMapProps {
  projectId: string;
}

export function Stage2EmpathyMap({ projectId }: Stage2EmpathyMapProps) {
  const router = useRouter();
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [autoResearchLoading, setAutoResearchLoading] = useState(false);
  const lastCoachUserRef = useRef("");
  const dataRef = useRef<EmpathyMapData | null>(null);
  const autoResearchStartedRef = useRef(false);

  const [startingPoint, setStartingPoint] = useState("");
  const [data, setData] = useState<EmpathyMapData>({
    personaName: "",
    personaContext: "",
    personaSituationRaw: "",
    personaThumbnailUrl: "",
    personaQnaComplete: false,
    contextualInsights: "",
    toKnowUnknowns: [],
    contextualPrep: defaultContextualPrep(),
    contextualDimensionResearch: emptyContextualDimensionResearch(),
    quadrants: emptyEmpathyMapQuadrants(),
  });

  dataRef.current = data;

  const introActive = isContextualIntroActive(data.contextualPrep);
  const researchActive = isContextualResearchActive(data.contextualPrep);

  useWorkspaceScrollOnEnter(
    introActive && !introDone ? "intro" : researchActive ? "research" : "work",
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [point, s2] = await Promise.all([
          resolveStage1StartingPoint(projectId),
          fetchStage2EmpathyMap(projectId),
        ]);
        if (cancelled) return;
        setStartingPoint(point);
        const loaded = {
          ...s2.data,
          quadrants: emptyEmpathyMapQuadrants(),
        };
        setData(loaded);
        setArtifactId(s2.artifactId);
        if (loaded.contextualPrep.autoResearchComplete) {
          setIntroDone(true);
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
    async (next: EmpathyMapData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const { artifactId: id } = await saveStage2EmpathyMap({
          projectId,
          artifactId,
          data: { ...next, quadrants: emptyEmpathyMapQuadrants() },
        });
        setArtifactId(id);
        setLastSavedAt(
          new Intl.DateTimeFormat("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
        );
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다.");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [artifactId, projectId],
  );

  useDebouncedPersist({
    data,
    enabled: !loading,
    save: saveArtifact,
  });

  const stage2PurposeCopy = useMemo(() => getStagePurposeCopy(2), []);

  const introMessages = useMemo(
    (): CoachDialogItem[] => buildContextualDiscoveryIntroMessages(startingPoint),
    [startingPoint],
  );

  const selectedDimensions =
    data.contextualPrep.selectedDimensions ?? [];

  const researchCoachMessages = useMemo((): CoachDialogItem[] => {
    if (!researchActive && !autoResearchLoading) return [];
    return buildResearchCoachKickoff(
      startingPoint,
      selectedDimensions,
      autoResearchLoading,
    );
  }, [
    autoResearchLoading,
    researchActive,
    selectedDimensions,
    startingPoint,
  ]);

  const runAutoResearchPipeline = useCallback(async () => {
    if (autoResearchStartedRef.current) return;
    if (dataRef.current?.contextualPrep.autoResearchComplete) return;

    autoResearchStartedRef.current = true;
    const problem = startingPoint.trim();
    const { selected } = planAutoResearch(problem);

    setAutoResearchLoading(true);
    setData((prev) => ({
      ...prev,
      contextualPrep: {
        ...prev.contextualPrep,
        phase: "research",
        step: "done",
        selectedDimensions: selected,
        autoResearchComplete: false,
      },
      contextualDimensionResearch: Object.fromEntries(
        selected.map((id) => [id, { status: "loading" as const, findings: "" }]),
      ),
    }));

    const research = await runAutoContextualResearch(
      problem,
      selected,
      (id, entry) => {
        setData((prev) => ({
          ...prev,
          contextualDimensionResearch: {
            ...prev.contextualDimensionResearch,
            [id]: entry,
          },
        }));
      },
    );

    setData((prev) => {
      const prep = {
        ...prev.contextualPrep,
        phase: "research" as const,
        step: "done" as const,
        selectedDimensions: selected,
      };
      const patch = buildArtifactPatchAfterAutoResearch(problem, prep, research);
      return { ...prev, ...patch };
    });
    setAutoResearchLoading(false);
  }, [startingPoint]);

  useEffect(() => {
    if (loading) return;
    if (!introDone) return;
    if (data.contextualPrep.autoResearchComplete) return;
    void runAutoResearchPipeline();
  }, [
    data.contextualPrep.autoResearchComplete,
    introDone,
    loading,
    runAutoResearchPipeline,
  ]);

  useEffect(() => {
    if (loading) return;
    if (!data.contextualPrep.autoResearchComplete) return;
    setIntroDone(true);
  }, [data.contextualPrep.autoResearchComplete, loading]);

  const applyContextualPatch = useCallback(
    (
      patch: ReturnType<typeof parseContextualUserEdit>,
      replace = false,
    ) => {
      if (!patch) return;
      setData((prev) => {
        const answers = applyContextualAnswerPatch(
          prev.contextualPrep.answers,
          patch,
          { replace },
        );
        const selected = prev.contextualPrep.selectedDimensions ?? [];
        return {
          ...prev,
          contextualPrep: { ...prev.contextualPrep, answers },
          contextualInsights: buildContextualSummary(
            startingPoint,
            answers,
            prev.contextualPrep.confirmNote,
          ),
          toKnowUnknowns: deriveToKnowFromContextual(
            startingPoint,
            answers,
            selected,
          ),
        };
      });
    },
    [startingPoint],
  );

  const buildResearchArtifactSummary = useCallback(
    (snapshot: EmpathyMapData) => {
      const selected =
        snapshot.contextualPrep.selectedDimensions ??
        CONTEXTUAL_DIMENSIONS.map((d) => d.id);
      const blocks = selected.map((id) => {
        const d = getDimensionDef(id);
        const entry = snapshot.contextualDimensionResearch[id];
        const items = snapshot.contextualPrep.answers[id];
        const listed = items?.length
          ? items.map((x) => `· ${x}`).join("\n")
          : "(없음)";
        const findings = entry?.findings?.trim() || "(조사 전)";
        return `[${d.label}]\n요약: ${listed}\n조사: ${findings.slice(0, 500)}`;
      });
      const note = snapshot.contextualPrep.confirmNote?.trim();
      return `[문제점]\n${startingPoint || "(없음)"}\n\n[선정 영역] ${selected.join(", ")}\n\n${blocks.join("\n\n")}${note ? `\n\n[코치 보완]\n${note}` : ""}\n\n[To-know 시드]\n${snapshot.toKnowUnknowns.join("\n") || "(없음)"}`;
    },
    [startingPoint],
  );

  const buildIntroArtifactSummary = useCallback(
    () =>
      `[1단계 문제점]\n${startingPoint || "(없음)"}\n\n[현재 화면]\n왼쪽 작업 영역에 사전 리서치 4단계 가이드·예시·단계 목적 안내가 표시되어 있습니다. 아직 사전 조사는 시작 전입니다.`,
    [startingPoint],
  );

  const handleIntroCoachMessage = useCallback(
    async (
      message: string,
      history: CoachChatHistoryItem[],
    ): Promise<string> => {
      const guide = getContextualIntroInputGuide();
      const { reply } = await sendCoachChat({
        message,
        history,
        context: {
          projectId,
          stageId: 2,
          stageTitle: stageChatTitle(2),
          artifactSummary: buildIntroArtifactSummary(),
          inputGuideContext: formatInputGuideForContext(guide),
          stageBehaviorNote: STAGE2_INTRO_CHAT_HINT,
        },
      });
      return reply;
    },
    [buildIntroArtifactSummary, projectId],
  );

  const handleCoachMessage = useCallback(
    async (
      message: string,
      history: CoachChatHistoryItem[],
    ): Promise<string> => {
      const userPatch = parseContextualUserEdit(message);
      if (userPatch) {
        const targetId = Object.keys(userPatch)[0] as ContextualDimensionId;
        const replace = contextualEditModeFromUser(message) === "replace";
        const snapshot = dataRef.current;
        if (!snapshot) {
          return "자료를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.";
        }
        const existing = snapshot.contextualPrep.answers[targetId];
        const merged = replace
          ? (userPatch[targetId] ?? [])
          : mergeAnswerItems(existing, userPatch[targetId] ?? []);
        applyContextualPatch(userPatch, replace);
        const def = getDimensionDef(targetId);
        return `좋아요. ${def.label} 보완 내용을 반영했어요 — ${formatAnswerList(merged)}.\n\n더 궁금한 점이 있으면 이어서 말씀해 주세요.`;
      }

      setData((prev) => ({
        ...prev,
        contextualPrep: appendContextualCoachNote(prev.contextualPrep, message),
        contextualInsights: buildContextualSummary(
          startingPoint,
          prev.contextualPrep.answers,
          appendContextualCoachNote(prev.contextualPrep, message).confirmNote,
        ),
      }));

      const snapshot = dataRef.current;
      if (!snapshot) {
        return "자료를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.";
      }

      const guide = getContextualRefineInputGuide();
      const { reply } = await sendCoachChat({
        message,
        history,
        context: {
          projectId,
          stageId: 2,
          stageTitle: stageChatTitle(2),
          artifactSummary: buildResearchArtifactSummary(snapshot),
          inputGuideContext: formatInputGuideForContext(guide),
          stageBehaviorNote: STAGE2_RESEARCH_CHAT_HINT,
        },
      });
      return reply;
    },
    [
      applyContextualPatch,
      buildResearchArtifactSummary,
      projectId,
      startingPoint,
    ],
  );

  const handleContinue = useCallback(() => {
    router.push(`/project/${projectId}/stage/3`);
  }, [projectId, router]);

  const anyResearchLoading = useMemo(
    () =>
      autoResearchLoading ||
      selectedDimensions.some(
        (id) => data.contextualDimensionResearch[id]?.status === "loading",
      ),
    [autoResearchLoading, data.contextualDimensionResearch, selectedDimensions],
  );

  const canContinue =
    data.contextualPrep.autoResearchComplete &&
    selectedDimensions.some(
      (id) => data.contextualDimensionResearch[id]?.status === "done",
    );

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-warm bg-panel px-6 py-12 text-center text-[16px] text-muted">
        맥락 이해 자료를 불러오는 중…
      </div>
    );
  }

  const showWorkTable = introDone && (researchActive || autoResearchLoading);
  const showComposer = (introReady || introDone) && !autoResearchLoading;
  const introCoachActive = introReady && !introDone;
  const researchCoachActive = introDone && !autoResearchLoading;

  const coachPanel = (
    <AnimatedCoachPanel
      sceneKey={`stage-2-${projectId}-${introDone ? "research" : "intro"}`}
      statusLabel={introDone ? "짚어주는 중" : "듣는 중"}
      statusSub={
        introCoachActive
          ? "가이드 확인 · 질문"
          : introDone
            ? "사전 조사 · 보완 질문"
            : "맥락 이해하기"
      }
      messages={introDone ? researchCoachMessages : introMessages}
      onCoachMessage={
        introCoachActive
          ? handleIntroCoachMessage
          : researchCoachActive
            ? handleCoachMessage
            : undefined
      }
      onUserMessage={(msg) => {
        lastCoachUserRef.current = msg;
      }}
      formatCoachReply={
        researchCoachActive ? stripContextualEditMetaLine : undefined
      }
      onCoachReply={
        researchCoachActive
          ? (reply) => {
              const coachPatch = parseContextualCoachEdit(
                lastCoachUserRef.current,
                reply,
              );
              if (coachPatch) {
                applyContextualPatch(
                  coachPatch,
                  contextualEditModeFromUser(lastCoachUserRef.current) ===
                    "replace",
                );
              }
            }
          : undefined
      }
      onDialogComplete={() => setIntroReady(true)}
      inputGuide={
        showComposer
          ? introCoachActive
            ? getContextualIntroInputGuide()
            : getContextualRefineInputGuide()
          : undefined
      }
      showComposer={showComposer}
      chatContext={
        showComposer
          ? {
              projectId,
              stageId: 2,
              stageTitle: stageChatTitle(2),
              artifactSummary: introCoachActive
                ? buildIntroArtifactSummary()
                : buildResearchArtifactSummary(data),
              stageBehaviorNote: introCoachActive
                ? STAGE2_INTRO_CHAT_HINT
                : STAGE2_RESEARCH_CHAT_HINT,
            }
          : undefined
      }
    />
  );

  const workPanel = (
    <>
      <ContextualPurposeGuide
        startingPoint={startingPoint}
        compact={introDone}
      />
      {!showWorkTable ? (
        <>
          {introReady && !introDone ? (
            <StageContinueGatePanel
              caption="가이드를 확인하셨다면 다음으로 넘어가 주세요. 문제점에 맞는 사전 조사를 시작할게요."
              onContinue={() => setIntroDone(true)}
            />
          ) : (
            <StageWorkDiscoveryPlaceholder caption={stage2PurposeCopy.workCaption}>
              {stage2PurposeCopy.placeholderLines[0]}
              <br />
              {stage2PurposeCopy.placeholderLines[1]}
            </StageWorkDiscoveryPlaceholder>
          )}
        </>
      ) : (
        <ContextualResearchCanvas
          startingPoint={startingPoint}
          selectedDimensions={selectedDimensions}
          answers={data.contextualPrep.answers}
          research={data.contextualDimensionResearch}
          autoResearchLoading={autoResearchLoading}
        />
      )}
      {showWorkTable ? (
        <section className={`${stagePanel} mt-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={stageCaption}>
              {canContinue
                ? "사전 조사 결과를 확인했으면 다음 화면으로 이어가세요. 궁금한 점은 코치에게 말씀해 주세요."
                : autoResearchLoading
                  ? "문제점에 맞는 영역을 선정해 사전 조사하는 중이에요…"
                  : "사전 조사가 끝나면 다음으로 진행할 수 있어요."}
            </p>
            <p className="w-full text-[14px] text-muted">
              {saveError
                ? saveError
                : saving
                  ? "저장 중…"
                  : lastSavedAt
                    ? `마지막 저장 ${lastSavedAt}`
                    : "자동 저장됩니다."}
            </p>
            <div className="flex gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={1}
              />
              <WorkspaceForwardButton
                stageId={3}
                onClick={handleContinue}
                disabled={!canContinue || anyResearchLoading}
              />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );

  return (
    <StageRevealGroup>
      <div key={introDone ? "research" : "intro"} className="coach-page-enter">
        <StageTwoColumnLayout work={workPanel} coach={coachPanel} />
      </div>
    </StageRevealGroup>
  );
}
