"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SimulatedAsyncProgressPanel } from "@/components/stage/SimulatedAsyncProgressPanel";
import { useSimulatedAsyncProgress } from "@/hooks/useSimulatedAsyncProgress";
import { COACH_DISPLAY_NAME } from "@/lib/coach/constants";
import {
  getMultidisciplinaryExpert,
  latestInsightForExpert,
  PROBE_KIND_LABEL,
  type MultidisciplinaryAnalysisData,
  type MultidisciplinaryExpertId,
  type MultidisciplinaryFollowUp,
  type MultidisciplinaryProbeQuestion,
  type MultidisciplinarySubjectAnalysis,
} from "@/lib/stages/stage4/multidisciplinaryAnalysis";
import { requestMultidisciplinaryAnalysis } from "@/lib/stages/stage4/multidisciplinaryAnalysisClient";
import { resolveAddressedExpert } from "@/lib/stages/stage4/multidisciplinaryCoach";
import { requestMultidisciplinaryExpertReply } from "@/lib/stages/stage4/multidisciplinaryExpertReplyClient";
import type { ResearchSynthesisData } from "@/lib/stages/stage4/researchSynthesisTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
} from "@/lib/stages/ui";

type ChatBubble =
  | {
      id: string;
      kind: "facilitator";
      text: string;
    }
  | {
      id: string;
      kind: "expert";
      expertLabelKo: string;
      expertLabelEn: string;
      lens?: string;
      text: string;
    }
  | {
      id: string;
      kind: "user";
      text: string;
    };

interface MultidisciplinaryAnalysisSectionProps {
  projectId: string;
  synthesis: ResearchSynthesisData;
  analysis: MultidisciplinaryAnalysisData;
  onAnalysisChange: (next: MultidisciplinaryAnalysisData) => void;
  subjectId: string;
  subjectName: string;
  problem?: string;
}

function buildDialogueBubbles(
  analysis: MultidisciplinaryAnalysisData,
  subjectId: string,
  subjectName: string,
): ChatBubble[] {
  const row = analysis.bySubject.find((s) => s.subjectId === subjectId);
  if (!row?.insights.length) return [];

  const bubbles: ChatBubble[] = [
    {
      id: `fac-intro-${subjectId}`,
      kind: "facilitator",
      text: `「${subjectName}」 조사 결과를 다학제 렌즈로 읽어 볼게요. 전문가들이 표면 너머의 배경을 학습한 뒤, 대화하듯 해설해 줄 거예요.`,
    },
  ];

  let bridged = false;
  row.insights.forEach((insight, idx) => {
    if ((insight.round ?? 0) >= 1 && !bridged) {
      bridged = true;
      bubbles.push({
        id: `fac-bridge-${subjectId}`,
        kind: "facilitator",
        text: "여기서 이제 서로의 의견에 한 마디씩 더해 볼게요. 단순 동의가 아니라 레이어를 충돌시켜 볼게요.",
      });
    }
    bubbles.push({
      id: `ins-${subjectId}-${idx}-${insight.expertId}-${insight.round}`,
      kind: "expert",
      expertLabelKo: insight.expertLabelKo,
      expertLabelEn: insight.expertLabelEn,
      lens: insight.lens,
      text: insight.analysis,
    });
  });

  if (row.insights.length) {
    bubbles.push({
      id: `fac-ask-${subjectId}`,
      kind: "facilitator",
      text: "궁금한 점이 있으면 아래 「근원 파고들기」 칩이나 전문가를 고른 뒤 이어서 물어보세요.",
    });
  }

  for (const fu of row.followUps ?? []) {
    bubbles.push({
      id: `fu-q-${fu.id}`,
      kind: "user",
      text: fu.question,
    });
    bubbles.push({
      id: `fu-a-${fu.id}`,
      kind: "expert",
      expertLabelKo: fu.expertLabelKo,
      expertLabelEn: fu.expertLabelEn,
      text: fu.reply,
    });
  }

  return bubbles;
}

function upsertSubjectRow(
  analysis: MultidisciplinaryAnalysisData,
  subjectId: string,
  subjectName: string,
  patch: Partial<MultidisciplinarySubjectAnalysis>,
): MultidisciplinaryAnalysisData {
  const existing = analysis.bySubject.find((s) => s.subjectId === subjectId);
  const nextRow: MultidisciplinarySubjectAnalysis = {
    subjectId,
    subjectName: subjectName || existing?.subjectName || "",
    insights: existing?.insights ?? [],
    followUps: existing?.followUps ?? [],
    rootReading: existing?.rootReading ?? null,
    probeQuestions: existing?.probeQuestions ?? [],
    handedOffClaimIds: existing?.handedOffClaimIds ?? [],
    ...patch,
  };
  const bySubject = existing
    ? analysis.bySubject.map((s) =>
        s.subjectId === subjectId ? { ...s, ...nextRow } : s,
      )
    : [...analysis.bySubject, nextRow];
  return { ...analysis, bySubject };
}

export function MultidisciplinaryAnalysisSection({
  projectId,
  synthesis,
  analysis,
  onAnalysisChange,
  subjectId,
  subjectName,
  problem = "",
}: MultidisciplinaryAnalysisSectionProps) {
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [selectedExpertId, setSelectedExpertId] =
    useState<MultidisciplinaryExpertId | "">("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const progress = useSimulatedAsyncProgress(loading, 28_000);

  const subjectRow = useMemo(
    () => analysis.bySubject.find((s) => s.subjectId === subjectId) ?? null,
    [analysis.bySubject, subjectId],
  );

  const bubbles = useMemo(
    () => buildDialogueBubbles(analysis, subjectId, subjectName),
    [analysis, subjectId, subjectName],
  );

  const hasSubjectContent = (subjectRow?.insights.length ?? 0) > 0;

  const subjectNotes = useMemo(
    () => synthesis.notes.filter((n) => n.subjectId === subjectId),
    [subjectId, synthesis.notes],
  );

  const expertOptions = useMemo(() => {
    const ids =
      analysis.selectedExpertIds.length > 0
        ? analysis.selectedExpertIds
        : [
            ...new Set(
              (subjectRow?.insights ?? []).map((i) => i.expertId),
            ),
          ];
    return ids
      .map((id) => getMultidisciplinaryExpert(id))
      .filter((e): e is NonNullable<typeof e> => Boolean(e));
  }, [analysis.selectedExpertIds, subjectRow?.insights]);

  useEffect(() => {
    if (!selectedExpertId && expertOptions[0]) {
      setSelectedExpertId(expertOptions[0].id);
    }
  }, [expertOptions, selectedExpertId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [bubbles.length, asking, loading]);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await requestMultidisciplinaryAnalysis({
        projectId,
        synthesis,
      });
      onAnalysisChange({
        ...next,
        bySubject: next.bySubject.map((s) => {
          const prev = analysis.bySubject.find(
            (p) => p.subjectId === s.subjectId,
          );
          return {
            ...s,
            followUps:
              s.subjectId === subjectId
                ? []
                : (prev?.followUps ?? s.followUps ?? []),
            handedOffClaimIds:
              s.subjectId === subjectId
                ? []
                : (prev?.handedOffClaimIds ?? s.handedOffClaimIds ?? []),
          };
        }),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "다학제적 분석에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [analysis.bySubject, onAnalysisChange, projectId, subjectId, synthesis]);

  const askExpert = useCallback(
    async (questionOverride?: string, expertOverride?: MultidisciplinaryExpertId) => {
      const question = (questionOverride ?? draft).trim();
      if (!question || !hasSubjectContent || asking) return;

      const fromText = resolveAddressedExpert(
        question,
        expertOptions.map((e) => e.id),
      );
      const expert =
        (expertOverride
          ? getMultidisciplinaryExpert(expertOverride)
          : null) ??
        fromText ??
        (selectedExpertId
          ? getMultidisciplinaryExpert(selectedExpertId)
          : null) ??
        expertOptions[0] ??
        null;

      if (!expert) {
        setError("질문할 전문가를 먼저 선택해 주세요.");
        return;
      }

      setAsking(true);
      setError(null);
      try {
        const notes = subjectNotes;
        const prior =
          latestInsightForExpert(subjectRow?.insights ?? [], expert.id)
            ?.analysis ?? "";
        const { reply, rootReading } = await requestMultidisciplinaryExpertReply({
          projectId,
          subjectId,
          subjectName,
          expertId: expert.id,
          question,
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
          problem,
          rootReading: subjectRow?.rootReading ?? null,
          noteIds: notes.map((n) => n.id),
        });

        const followUp: MultidisciplinaryFollowUp = {
          id: `fu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          expertId: expert.id,
          expertLabelKo: expert.labelKo,
          expertLabelEn: expert.labelEn,
          question,
          reply,
          createdAt: new Date().toISOString(),
        };

        onAnalysisChange(
          upsertSubjectRow(analysis, subjectId, subjectName, {
            followUps: [...(subjectRow?.followUps ?? []), followUp],
            rootReading: rootReading ?? subjectRow?.rootReading ?? null,
          }),
        );
        setDraft("");
        setSelectedExpertId(expert.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "전문가 답변에 실패했습니다.");
      } finally {
        setAsking(false);
      }
    },
    [
      analysis,
      asking,
      draft,
      expertOptions,
      hasSubjectContent,
      onAnalysisChange,
      problem,
      projectId,
      selectedExpertId,
      subjectId,
      subjectName,
      subjectNotes,
      subjectRow?.followUps,
      subjectRow?.insights,
      subjectRow?.rootReading,
    ],
  );

  const onProbeClick = useCallback(
    (probe: MultidisciplinaryProbeQuestion) => {
      if (probe.suggestedExpertId) {
        setSelectedExpertId(probe.suggestedExpertId);
      }
      setDraft(probe.text);
      void askExpert(probe.text, probe.suggestedExpertId);
    },
    [askExpert],
  );

  const displayName = subjectName.trim() || "조사 대상";
  const probes = subjectRow?.probeQuestions ?? [];

  return (
    <section className="rounded-xl border border-border-warm bg-cream/30 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={stageLabel}>다학제적 분석</p>
          <p className="mt-0.5 text-[13px] font-medium text-muted">
            Multi-disciplinary Analysis · {displayName}
          </p>
          <p className={`mt-2 ${stageCaption}`}>
            전문가들이 조사 기록의 표면 너머를 학습한 뒤, 대화하듯 해설하고
            아래에서 이어서 질문할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runAnalysis()}
          className={stageBtnPrimary}
        >
          {loading
            ? "분석 중…"
            : hasSubjectContent
              ? "다시 분석하기"
              : "다학제적 분석"}
        </button>
      </div>

      {loading ? (
        <div className="mt-4">
          <SimulatedAsyncProgressPanel
            title="전문가들이 조사 결과를 깊이 학습하고 있어요"
            progress={progress.progress}
            remainingSec={progress.remainingSec}
            ariaLabel="다학제적 분석 진행"
            almostDoneLabel="서로 의견을 주고받는 중…"
            completingLabel="대화를 담는 중…"
          />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-[14px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {hasSubjectContent && !loading ? (
        <div className="mt-4 space-y-3">
          {bubbles.length > 0 ? (
            <div
              ref={scrollRef}
              className="max-h-[28rem] space-y-2.5 overflow-y-auto rounded-lg border border-border-warm bg-panel px-3 py-3"
            >
              {bubbles.map((b) => {
                if (b.kind === "user") {
                  return (
                    <div key={b.id} className="flex justify-end">
                      <div className="max-w-[90%] rounded-lg bg-spotlight/25 px-3 py-2 text-[14px] leading-relaxed text-foreground break-keep whitespace-pre-wrap">
                        {b.text}
                      </div>
                    </div>
                  );
                }
                if (b.kind === "facilitator") {
                  return (
                    <div key={b.id} className="space-y-1">
                      <p className="text-[12px] font-semibold text-foreground">
                        {COACH_DISPLAY_NAME}
                        <span className="ml-1.5 text-[11px] font-medium text-muted">
                          코치
                        </span>
                      </p>
                      <div className="rounded-lg border border-spotlight/30 bg-highlight/40 px-3 py-2 text-[14px] leading-relaxed text-foreground break-keep whitespace-pre-wrap">
                        {b.text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={b.id} className="space-y-1">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground break-keep">
                        {b.expertLabelKo}
                        <span className="ml-1.5 text-[12px] font-medium text-muted">
                          {b.expertLabelEn}
                        </span>
                      </p>
                      {b.lens ? (
                        <p className="text-[11px] text-muted break-keep">
                          {b.lens}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-border-warm bg-cream/50 px-3 py-2 text-[14px] leading-relaxed text-foreground break-keep whitespace-pre-wrap">
                      {b.text}
                    </div>
                  </div>
                );
              })}
              {asking ? (
                <p className={`px-1 ${stageCaption}`}>전문가가 답하는 중…</p>
              ) : null}
            </div>
          ) : null}

          {probes.length > 0 ? (
            <div>
              <p className={`mb-1.5 ${stageLabel}`}>근원 파고들기</p>
              <div className="flex flex-wrap gap-1.5">
                {probes.map((probe) => (
                  <button
                    key={probe.id}
                    type="button"
                    disabled={asking}
                    onClick={() => onProbeClick(probe)}
                    className="max-w-full rounded-md border border-border-warm bg-panel px-2.5 py-1.5 text-left text-[13px] font-medium text-foreground hover:border-spotlight hover:bg-cream disabled:opacity-50"
                  >
                    <span className="mr-1.5 text-[11px] font-semibold text-muted">
                      {PROBE_KIND_LABEL[probe.kind]}
                    </span>
                    <span className="break-keep">{probe.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {expertOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {expertOptions.map((e) => {
                const selected = selectedExpertId === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedExpertId(e.id)}
                    className={[
                      "rounded-md border px-2.5 py-1 text-[13px] font-semibold transition-colors",
                      selected
                        ? "border-spotlight bg-spotlight text-on-spotlight"
                        : "border-border-warm bg-panel text-foreground hover:bg-cream",
                    ].join(" ")}
                  >
                    {e.labelKo}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className={`mb-1 block ${stageLabel}`}>추가 질문</label>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void askExpert();
                  }
                }}
                disabled={asking}
                placeholder="예: 심리학자님, 이 불안감의 근원은 어디서 올까요?"
                className={`w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput}`}
              />
            </div>
            <button
              type="button"
              disabled={asking || !draft.trim()}
              onClick={() => void askExpert()}
              className={stageBtnSecondary}
            >
              {asking ? "답변 중…" : "질문하기"}
            </button>
          </div>
        </div>
      ) : null}

      {!hasSubjectContent && !loading ? (
        <p className={`mt-4 ${stageCaption}`}>
          프로필·언급·관찰·발견한 것을 적은 뒤 「다학제적 분석」을 누르면, 이
          대상자 전용 전문가 대화가 열려요.
        </p>
      ) : null}
    </section>
  );
}
