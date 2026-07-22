"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StageContainer } from "@/components/layout/StageContainer";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { Stage4ResearchSynthesisPanel } from "@/components/stage/stage4/Stage4ResearchSynthesisPanel";
import {
  fetchStage4Discoveries,
  saveStage4Discoveries,
} from "@/lib/artifacts/stage4Discoveries";
import { fetchStage3FieldResearch } from "@/lib/artifacts/stage3FieldResearch";
import {
  formatInputGuideForContext,
  getStageWorkInputGuide,
} from "@/lib/coach/inputGuidance";
import {
  sendCoachChat,
  type CoachChatHistoryItem,
} from "@/lib/coach/chatClient";
import { loadToKnowBuildContext } from "@/lib/stages/fieldResearch/stage3Bootstrap";
import { mergeStage4WithStage3Empathy } from "@/lib/stages/stage4/mergeStage4FromStage3Empathy";
import { buildSynthesisDebriefContext } from "@/lib/stages/stage4/buildSynthesisDebriefContext";
import { canAdvanceToStage5 } from "@/lib/stages/stage4/researchSynthesisGates";
import {
  getMultidisciplinaryExpert,
  hasMultidisciplinaryAnalysisContent,
  latestInsightForExpert,
  type MultidisciplinaryAnalysisData,
} from "@/lib/stages/stage4/multidisciplinaryAnalysis";
import { requestMultidisciplinaryAnalysis } from "@/lib/stages/stage4/multidisciplinaryAnalysisClient";
import {
  buildExpertChoicePrompt,
  insightToSpeakerTurn,
  isMultidisciplinaryAnalysisRequest,
  resolveAddressedExpert,
  type CoachMessageHandlerResult,
  type CoachSpeakerTurnPayload,
} from "@/lib/stages/stage4/multidisciplinaryCoach";
import { requestMultidisciplinaryExpertReply } from "@/lib/stages/stage4/multidisciplinaryExpertReplyClient";
import {
  defaultStage4Data,
  type Stage4DiscoveriesData,
} from "@/lib/stages/stage4/types";
import { ensureSubjectEmpathyLinks } from "@/lib/stages/stage4/syncSubjectEmpathy";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import { stageCaption, stagePanel } from "@/lib/stages/ui";

interface Stage4DiscoveriesProps {
  projectId: string;
}

const STAGE4_COACH_MESSAGES: CoachDialogItem[] = [
  {
    type: "highlight",
    label: "발견 정리하기",
    content:
      "조사 대상마다 리서치 자료를 올리면 공감맵 네 칸에 배치돼요. 확인·수정해 주세요.",
  },
  {
    type: "bubble",
    content:
      "자료를 올린 뒤에는 여기에서 다학제적 분석을 요청할 수 있어요. 준비가 되면 알려 드릴게요.",
  },
];

function buildMdaOfferText(subjectName: string): string {
  const name = subjectName.trim() || "이 조사 대상";
  return [
    `「${name}」 리서치 자료가 올라왔어요. 이제 다학제적 분석이 가능해요.`,
    "",
    "예)",
    "· 「다학제적 분석 부탁해요」",
    "· 「전문가 해설 들려줘」",
    "· 「심리학자님 관점으로 읽어줘」(분석 후 이어서)",
    "",
    "원하시면 말씀해 주세요. 주제에 맞는 전문가들이 공감맵을 바탕으로 대화하듯 해설해 드릴게요.",
  ].join("\n");
}

function buildSubjectSpeakerTurns(
  analysis: MultidisciplinaryAnalysisData,
  subjectId: string,
  subjectName: string,
  withKevinIntro: boolean,
): CoachSpeakerTurnPayload[] {
  const row = analysis.bySubject.find((s) => s.subjectId === subjectId);
  const insights = row?.insights ?? [];
  const turns: CoachSpeakerTurnPayload[] = [];
  if (withKevinIntro) {
    turns.push({
      speaker: "kevin",
      text: insights.length
        ? `「${subjectName}」 조사 결과를 다학제 렌즈로 읽어 볼게요. 전문가들이 먼저 한 번씩 말씀하시고, 서로의 말에 이어서 반응도 나눠 주실 거예요.`
        : `「${subjectName}」에 대한 다학제 해설이 아직 없어요. 공감맵에 내용을 조금 더 채운 뒤 다시 「다학제적 분석」을 요청해 주세요.`,
    });
  }
  let bridged = false;
  for (const insight of insights) {
    if ((insight.round ?? 0) >= 1 && !bridged) {
      bridged = true;
      turns.push({
        speaker: "kevin",
        text: "여기서 이제 서로의 의견에 한 마디씩 더해 볼게요.",
      });
    }
    turns.push(insightToSpeakerTurn(insight));
  }
  if (insights.length) {
    const uniqueExperts = [
      ...new Map(
        insights
          .map((i) => getMultidisciplinaryExpert(i.expertId))
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
          .map((e) => [e.id, e] as const),
      ).values(),
    ];
    turns.push({
      speaker: "kevin",
      text: `궁금한 점이 있으면 전문가 이름(예: ${uniqueExperts[0]?.labelKo ?? "인류학자"}님)으로 이어서 물어보세요.`,
    });
  }
  return turns;
}

export function Stage4Discoveries({ projectId }: Stage4DiscoveriesProps) {
  const locale = useUiLocale();
  const router = useRouter();
  const [data, setData] = useState<Stage4DiscoveriesData>(defaultStage4Data());
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [empathyGenContext, setEmpathyGenContext] = useState<{
    problem: string;
    prePmfSummary: string;
  }>({ problem: "", prePmfSummary: "" });
  const [activeSubject, setActiveSubject] = useState<{
    id: string;
    name: string;
    index: number;
    hasResearchMedia: boolean;
  } | null>(null);
  const [injectedSpeakerTurns, setInjectedSpeakerTurns] = useState<{
    id: string;
    turns: CoachSpeakerTurnPayload[];
  } | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const mediaCountPrimedRef = useRef(false);
  const prevMediaCountRef = useRef<Record<string, number>>({});
  const offeredMdaSubjectIdsRef = useRef<Set<string>>(new Set());

  const formatSavedTime = useCallback(() => {
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [result, stage3] = await Promise.all([
          fetchStage4Discoveries(projectId),
          fetchStage3FieldResearch(projectId),
        ]);
        if (!cancelled) {
          setData(
            ensureSubjectEmpathyLinks(
              mergeStage4WithStage3Empathy(result.data, stage3.data),
            ),
          );
          setArtifactId(result.artifactId);
          const ctx = await loadToKnowBuildContext(projectId);
          setEmpathyGenContext({
            problem: ctx.startingPoint,
            prePmfSummary: ctx.contextualInsights ?? "",
          });
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
    async (next: Stage4DiscoveriesData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const linked = ensureSubjectEmpathyLinks(next);
        const { artifactId: id } = await saveStage4Discoveries({
          projectId,
          artifactId,
          data: linked,
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
    [artifactId, formatSavedTime, projectId],
  );

  const { flush: flushSave } = useDebouncedPersist({
    data,
    enabled: !loading,
    save: saveArtifact,
  });

  /** 리서치 자료가 새로 올라오면 Kevin이 다학제 분석 안내 */
  useEffect(() => {
    if (loading) return;
    const subjects = data.researchSynthesis.subjects;

    if (!mediaCountPrimedRef.current) {
      for (const s of subjects) {
        prevMediaCountRef.current[s.id] = s.mediaFiles.length;
      }
      mediaCountPrimedRef.current = true;
      return;
    }

    for (const s of subjects) {
      const prev = prevMediaCountRef.current[s.id] ?? 0;
      const next = s.mediaFiles.length;
      prevMediaCountRef.current[s.id] = next;
      if (next <= prev) continue;
      if (offeredMdaSubjectIdsRef.current.has(s.id)) continue;
      offeredMdaSubjectIdsRef.current.add(s.id);
      const name = s.name.trim() || `조사 대상`;
      setInjectedSpeakerTurns({
        id: `mda-offer-${s.id}-${Date.now()}`,
        turns: [{ speaker: "kevin", text: buildMdaOfferText(name) }],
      });
      break;
    }
  }, [data.researchSynthesis.subjects, loading]);

  const canGoStage5 = canAdvanceToStage5(data);

  const handleContinueToStage5 = useCallback(async () => {
    if (!canGoStage5) return;
    try {
      await flushSave();
      router.push(`/project/${projectId}/stage/5`);
    } catch {
      /* saveError set */
    }
  }, [canGoStage5, flushSave, projectId, router]);

  const resolveActiveSubject = useCallback(() => {
    const synthesis = dataRef.current.researchSynthesis;
    if (activeSubject) return activeSubject;
    const s = synthesis.subjects[0];
    if (!s) return null;
    return {
      id: s.id,
      name: s.name.trim() || "조사 대상 1",
      index: 0,
      hasResearchMedia: s.mediaFiles.length > 0,
    };
  }, [activeSubject]);

  const handleCoachMessage = useCallback(
    async (
      message: string,
      history: CoachChatHistoryItem[],
    ): Promise<CoachMessageHandlerResult> => {
      const synthesis = dataRef.current.researchSynthesis;
      const subject = resolveActiveSubject();

      if (isMultidisciplinaryAnalysisRequest(message)) {
        if (!subject) {
          return {
            reply:
              "먼저 왼쪽에서 조사 대상을 확인해 주세요. 그다음 다학제적 분석을 요청해 주시면 돼요.",
          };
        }
        const hasNotes = synthesis.notes.some(
          (n) => n.subjectId === subject.id && n.text.trim(),
        );
        const hasMedia = synthesis.subjects.some(
          (s) => s.id === subject.id && s.mediaFiles.length > 0,
        );
        const hasProfile = Boolean(
          synthesis.subjects.find((s) => s.id === subject.id)?.context.trim() ||
            synthesis.subjects.find((s) => s.id === subject.id)?.name.trim(),
        );
        if (!hasNotes && !hasMedia && !hasProfile) {
          return {
            reply:
              "분석하려면 리서치 자료를 올리거나 공감맵·프로필을 조금 채워 주세요.",
          };
        }

        const analysis = await requestMultidisciplinaryAnalysis({
          projectId,
          synthesis,
        });
        setData((prev) =>
          ensureSubjectEmpathyLinks({
            ...prev,
            researchSynthesis: {
              ...prev.researchSynthesis,
              multidisciplinaryAnalysis: analysis,
            },
          }),
        );

        return {
          turns: buildSubjectSpeakerTurns(
            analysis,
            subject.id,
            subject.name,
            true,
          ),
        };
      }

      const analysis = synthesis.multidisciplinaryAnalysis;
      const subjectRow = subject
        ? analysis.bySubject.find((s) => s.subjectId === subject.id)
        : undefined;
      const selectedIds =
        analysis.selectedExpertIds.length > 0
          ? analysis.selectedExpertIds
          : (subjectRow?.insights.map((i) => i.expertId) ?? []);
      const addressed = resolveAddressedExpert(message, selectedIds);

      if (addressed) {
        if (!subject || !hasMultidisciplinaryAnalysisContent(analysis)) {
          return {
            reply:
              "아직 다학제적 분석이 없어요. 「다학제적 분석 부탁해요」처럼 먼저 요청해 주세요.",
          };
        }
        const prior =
          latestInsightForExpert(
            subjectRow?.insights ?? [],
            addressed.id,
          )?.analysis ?? "";
        const notes = synthesis.notes.filter((n) => n.subjectId === subject.id);
        const { reply, rootReading } = await requestMultidisciplinaryExpertReply(
          {
            projectId,
            subjectId: subject.id,
            subjectName: subject.name,
            expertId: addressed.id,
            question: message,
            priorInsight: prior,
            quotes: notes
              .filter((n) => n.kind === "quote")
              .map((n) => ({ id: n.id, text: n.text })),
            observations: notes
              .filter((n) => n.kind === "observation")
              .map((n) => ({ id: n.id, text: n.text })),
            findings: notes
              .filter((n) => n.kind === "finding")
              .map((n) => ({ id: n.id, text: n.text })),
            problem: empathyGenContext.problem,
            rootReading: subjectRow?.rootReading ?? null,
            noteIds: notes.map((n) => n.id),
          },
        );

        if (rootReading) {
          setData((prev) => {
            const bySubject = prev.researchSynthesis.multidisciplinaryAnalysis.bySubject.map(
              (row) =>
                row.subjectId === subject.id
                  ? { ...row, rootReading }
                  : row,
            );
            return {
              ...prev,
              researchSynthesis: {
                ...prev.researchSynthesis,
                multidisciplinaryAnalysis: {
                  ...prev.researchSynthesis.multidisciplinaryAnalysis,
                  bySubject,
                },
              },
            };
          });
        }

        return {
          turns: [
            {
              speaker: "expert",
              text: reply,
              expertId: addressed.id,
              expertLabelKo: addressed.labelKo,
              expertLabelEn: addressed.labelEn,
              lens: addressed.lens,
            },
          ],
        };
      }

      if (
        hasMultidisciplinaryAnalysisContent(analysis) &&
        selectedIds.length > 0 &&
        /(전문가|해설|더\s*알려|궁금|어때요|어떻게)/.test(message)
      ) {
        const experts = selectedIds
          .map((id) => getMultidisciplinaryExpert(id))
          .filter((e): e is NonNullable<typeof e> => Boolean(e));
        return { reply: buildExpertChoicePrompt(experts) };
      }

      const guide = getStageWorkInputGuide(4, locale);
      const { reply } = await sendCoachChat({
        message,
        history,
        context: {
          projectId,
          stageId: 4,
          stageTitle: "발견 정리하기",
          artifactSummary: buildSynthesisDebriefContext(synthesis),
          stageBehaviorNote:
            "발견 정리 단계입니다. 리서치 자료 업로드 후 다학제적 분석을 이 대화에서 요청할 수 있다고 안내하세요. 사용자가 「다학제적 분석」을 말하면 전문가 패널이 이어집니다.",
          inputGuideContext: formatInputGuideForContext(guide),
        },
      });
      return reply;
    },
    [
      empathyGenContext.problem,
      locale,
      projectId,
      resolveActiveSubject,
    ],
  );

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 4,
      stageTitle: "발견 정리하기",
      artifactSummary: buildSynthesisDebriefContext(data.researchSynthesis),
      stageBehaviorNote:
        "발견 정리 단계입니다. 다학제적 분석은 Kevin 대화에서 요청합니다.",
    }),
    [data.researchSynthesis, projectId],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-warm bg-white px-6 py-12 text-center text-[16px] text-muted">
        발견 정리 자료를 불러오는 중…
      </div>
    );
  }

  return (
    <StageContainer
      stageNumber={4}
      sceneKey={`stage-4-${projectId}`}
      coach={
        <AnimatedCoachPanel
          sceneKey={`stage-4-coach-${projectId}`}
          statusLabel="짚어주는 중"
          statusSub="발견 정리하기"
          messages={STAGE4_COACH_MESSAGES}
          inputGuide={getStageWorkInputGuide(4, locale)}
          chatContext={chatContext}
          onCoachMessage={handleCoachMessage}
          injectedSpeakerTurns={injectedSpeakerTurns}
        />
      }
      work={
        <div className="space-y-4">
          <Stage4ResearchSynthesisPanel
            projectId={projectId}
            data={data}
            onChange={setData}
            problem={empathyGenContext.problem}
            prePmfSummary={empathyGenContext.prePmfSummary}
            onActiveSubjectChange={setActiveSubject}
          />

          <div
            className={`${stagePanel} stage-workspace-nav flex flex-wrap items-center justify-between gap-3`}
          >
            <p className={stageCaption}>
              {canGoStage5
                ? "조사 대상자에 대해 좀 더 잘 이해해보기 위해 사용자 여정 지도 그리기 단계로 진행할 수 있어요."
                : "조사 대상의 공감맵이나 리서치 내용을 최소 한 가지는 적어 주세요."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <WorkspaceBackButton
                projectId={projectId}
                fallbackStageId={3}
              />
              <WorkspaceForwardButton
                stageId={5}
                disabled={!canGoStage5 || saving}
                onClick={() => void handleContinueToStage5()}
              />
            </div>
            <p className={`w-full ${stageCaption}`}>
              {saveError
                ? saveError
                : saving
                  ? "저장 중…"
                  : lastSavedAt
                    ? `마지막 저장 ${lastSavedAt}`
                    : "자동 저장됩니다."}
            </p>
          </div>
        </div>
      }
    />
  );
}
