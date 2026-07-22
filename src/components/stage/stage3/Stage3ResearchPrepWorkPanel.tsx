"use client";

import {
  IconBulb,
  IconChevronDown,
  IconFileText,
  IconFileTypePdf,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage3ResearchGuideContent } from "@/components/stage/stage3/Stage3ResearchGuideContent";
import { SimulatedAsyncProgressPanel } from "@/components/stage/SimulatedAsyncProgressPanel";
import { ClickSequentialSections } from "@/components/stage/motion/ScrollSequentialSections";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { useProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { useSimulatedAsyncProgress } from "@/hooks/useSimulatedAsyncProgress";
import { getStagePageName } from "@/lib/navigation/stageNavLabels";
import { generateStage3ResearchPrep } from "@/lib/stages/fieldResearch/generateStage3ResearchPrepClient";
import { getResearchMethodEntry } from "@/lib/stages/fieldResearch/researchMethodCatalog";
import {
  downloadResearchGuideDoc,
  downloadResearchGuidePdf,
} from "@/lib/stages/fieldResearch/researchGuideExport";
import { buildToKnowExportRows } from "@/lib/stages/fieldResearch/toKnowExport";
import {
  normalizeStage3ResearchPrep,
  participantCountReasonText,
  researchPrepGatePassed,
  totalSelectedFromSegments,
  type Stage3ResearchPrep,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import {
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface Stage3ResearchPrepWorkPanelProps {
  projectId: string;
  data: FieldResearchData;
  onChange: (data: FieldResearchData) => void;
  onContinue: () => void;
  problem: string;
  prePmfSummary: string;
  targetLabels: string[];
  editable?: boolean;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

function updatePrep(
  data: FieldResearchData,
  patch: Partial<Stage3ResearchPrep>,
): FieldResearchData {
  return {
    ...data,
    researchPrep: { ...data.researchPrep, ...patch },
  };
}

export function Stage3ResearchPrepWorkPanel({
  projectId,
  data,
  onChange,
  onContinue,
  problem,
  prePmfSummary,
  targetLabels,
  editable = true,
  saving,
  saveError,
  lastSavedAt,
}: Stage3ResearchPrepWorkPanelProps) {
  const { projectTitle } = useProjectWorkspace();
  const prep = useMemo(
    () => normalizeStage3ResearchPrep(data.researchPrep),
    [data.researchPrep],
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "doc" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const generateStartedRef = useRef(false);
  const ready = researchPrepGatePassed(prep);

  const toKnowRows = useMemo(
    () =>
      Array.isArray(data.toKnowTable)
        ? data.toKnowTable.filter((r) => r.rowKind !== "core")
        : [],
    [data.toKnowTable],
  );

  const guideMeta = useMemo(
    () => ({
      projectTitle,
      problem,
      coreQuestion: data.toKnowCoreQuestion,
      methodLabels: prep.selectedMethods
        .map((id) => getResearchMethodEntry(id)?.label)
        .filter((v): v is string => Boolean(v)),
      participantCount: prep.selectedParticipantCount,
      segmentLabels: prep.segments.map(
        (s) => `${s.label} ${s.selectedCount}명`,
      ),
    }),
    [
      data.toKnowCoreQuestion,
      prep.segments,
      prep.selectedMethods,
      prep.selectedParticipantCount,
      problem,
      projectTitle,
    ],
  );

  const toKnowPreviewGroups = useMemo(() => {
    const rows = buildToKnowExportRows(
      toKnowRows,
      data.toKnowCoreQuestion || problem,
    );
    const buckets = new Map<string, string[]>();
    const order: string[] = [];
    for (const row of rows) {
      const subject = row.infoCategory.trim() || "대상자 미지정";
      if (!buckets.has(subject)) {
        buckets.set(subject, []);
        order.push(subject);
      }
      buckets.get(subject)!.push(row.infoToIdentify);
    }
    return order.map((subject) => ({
      subject,
      questions: buckets.get(subject)!,
    }));
  }, [data.toKnowCoreQuestion, problem, toKnowRows]);

  const toKnowQuestionCount = toKnowPreviewGroups.reduce(
    (sum, g) => sum + g.questions.length,
    0,
  );

  const runExport = useCallback(
    async (kind: "pdf" | "doc") => {
      if (exporting) return;
      setExportError(null);
      try {
        if (kind === "doc") {
          downloadResearchGuideDoc(toKnowRows, guideMeta);
          return;
        }
        setExporting("pdf");
        await downloadResearchGuidePdf(toKnowRows, guideMeta);
      } catch (e) {
        setExportError(
          e instanceof Error ? e.message : "가이드를 내려받지 못했습니다.",
        );
      } finally {
        setExporting(null);
      }
    },
    [exporting, guideMeta, toKnowRows],
  );
  const { progress, remainingSec, markComplete, reset } = useSimulatedAsyncProgress(
    generating,
    18_000,
  );

  const runGenerate = useCallback(async () => {
    if (!editable || generating) return;
    setGenerating(true);
    setGenError(null);
    reset();
    try {
      const nextPrep = await generateStage3ResearchPrep({
        problem,
        prePmfSummary: prePmfSummary || undefined,
        targetLabels,
      });
      markComplete();
      onChange(updatePrep(data, nextPrep));
    } catch (e) {
      generateStartedRef.current = false;
      setGenError(
        e instanceof Error ? e.message : "조사 준비 추천 생성에 실패했습니다.",
      );
    } finally {
      setGenerating(false);
    }
  }, [
    data,
    editable,
    generating,
    markComplete,
    onChange,
    prePmfSummary,
    problem,
    reset,
    targetLabels,
  ]);

  useEffect(() => {
    if (!editable || prep.recommendationsGenerated || generating) return;
    if (generateStartedRef.current) return;
    if (!problem.trim() && !prePmfSummary?.trim()) return;
    generateStartedRef.current = true;
    void runGenerate();
  }, [
    editable,
    generating,
    prep.recommendationsGenerated,
    prePmfSummary,
    problem,
    runGenerate,
  ]);

  const segmentTotal = totalSelectedFromSegments(prep);

  return (
    <div className="space-y-4">
      <section className={stagePanel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={stageLabel}>STEP 3 · 사용자 조사 준비하기</p>
            <h2 className={stageSectionTitle}>조사 계획 세우기</h2>
            <p className={`mt-1 ${stageSectionLead}`}>
              주관적 가설을 검증하기 위해 사용자 목소리를 듣는 단계예요. 아래
              리서치 가이드를 확인하고, 문제에 맞는 조사 방법과 인원을 정한 뒤
              To-know list로 이어가요.
            </p>
          </div>
          {editable ? (
            <span className="shrink-0 rounded-full border border-border-warm bg-cream px-3 py-1 text-[12px] font-medium text-muted">
              {generating
                ? "AI 분석 중…"
                : prep.recommendationsGenerated
                  ? "추천 준비됨"
                  : "AI 준비됨"}
            </span>
          ) : null}
        </div>

        {/* ── 리서치 가이드 (먼저 설명) ── */}
        <div className="mt-5 rounded-xl border border-spotlight/40 bg-highlight/50 px-5 py-4">
          <p className="inline-flex items-center gap-2 text-[15px] font-bold text-foreground">
            <IconBulb className="size-5 text-gold" stroke={1.75} aria-hidden />
            리서치 가이드
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted break-keep">
            사용자 조사는 아이디어가 맞는지 증명하는 게 아니라, 실제 삶의{" "}
            <strong className="font-semibold text-foreground">고통점(Pain)</strong>과
            숨은 <strong className="font-semibold text-foreground">욕망(Desire)</strong>
            을 관찰하는 과정이에요. 아래 CORE 1~3을 따라 방법·인원을 정하고,{" "}
            <strong className="font-semibold text-foreground">CORE 3</strong>에서 현장용
            리서치 가이드를 확인·다운로드하세요.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-border-warm bg-cream/60 px-5 py-5">
          <p className="text-[15px] font-semibold text-foreground break-keep">
            사전 조사 결과로 조사 방법·대상·인원을 추천해 드려요
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted break-keep">
            1·2단계에서 정리한 문제와 타겟을 바탕으로, 문제에 맞는 리서치
            방법과 적정 조사 인원·핵심 질문 방향을 채워 드립니다.
          </p>
          {generating ? (
            <div className="mt-4">
              <SimulatedAsyncProgressPanel
                title="조사 방법·대상·인원 추천 생성 중"
                progress={progress}
                remainingSec={remainingSec}
                ariaLabel="조사 준비 AI 진행률"
              />
            </div>
          ) : null}
          {genError ? (
            <p className="mt-3 text-[14px] text-rose-600 break-keep">{genError}</p>
          ) : null}
        </div>

        {/* ── CORE 1~3 · 같은 영역에서 클릭으로 하나씩 공개 ── */}
        <ClickSequentialSections
          className="mt-2"
          revealAll={!editable}
          resetKey={`${prep.recommendationsGenerated}-${prep.recommendedMethods.length}-${prep.segments.length}`}
          stepTitles={[
            "문제에 맞는 리서치 방법",
            "누구에게, 얼마나 조사할까?",
            "어떤 질문들을 해야 할까?",
          ]}
          doneHint="CORE 1~3을 모두 확인했어요. 아래에서 다음 단계로 이어갈 수 있어요."
        >
        {/* ── CORE 1 · 문제에 맞는 리서치 방법 ── */}
        <div className="mt-6 rounded-xl border border-border-warm bg-panel px-5 py-5">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-gold">
                CORE 1
              </p>
              <h3 className="mt-1 text-[18px] font-bold text-foreground break-keep">
                문제에 맞는 리서치 방법
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted break-keep">
                문제와 타겟을 분석해, 이 문제에 가장 적합한 리서치 방법을
                추천해 드려요. 각 방법이 <strong className="font-semibold text-foreground">
                왜 이 문제에 맞는지</strong> 함께 확인해 보세요.
              </p>

              {prep.methodRecommendationReason ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-spotlight/40 bg-highlight/50 px-3.5 py-2.5">
                  <IconBulb
                    className="mt-0.5 size-4 shrink-0 text-gold"
                    stroke={1.75}
                    aria-hidden
                  />
                  <p className="text-[13.5px] leading-relaxed text-foreground break-keep">
                    <span className="font-semibold">코치 추천</span> ·{" "}
                    {prep.methodRecommendationReason}
                  </p>
                </div>
              ) : null}

              {prep.recommendedMethods.length ? (
                <div className="mt-4 space-y-3">
                  {prep.recommendedMethods.map((methodId) => {
                    const entry = getResearchMethodEntry(methodId);
                    if (!entry) return null;
                    const rationale = prep.methodRationales[methodId]?.trim();
                    return (
                      <div
                        key={methodId}
                        className="rounded-xl border border-spotlight/50 bg-cream/50 px-4 py-3.5"
                      >
                        <p className="flex items-center gap-2 text-[15px] font-bold text-foreground break-keep">
                          {entry.label}
                          <span className="rounded-full bg-spotlight px-2 py-0.5 text-[11px] font-semibold text-on-spotlight">
                            추천
                          </span>
                        </p>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-muted break-keep">
                          {entry.summary}
                        </p>
                        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-border-warm bg-panel px-3 py-2.5">
                          <IconBulb
                            className="mt-0.5 size-4 shrink-0 text-gold"
                            stroke={1.75}
                            aria-hidden
                          />
                          <p className="text-[13.5px] leading-relaxed text-foreground break-keep">
                            <span className="font-semibold">이 문제에 적합한 이유</span>{" "}
                            · {rationale || `${entry.summary}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-[13.5px] text-muted break-keep">
                  {generating
                    ? "문제에 맞는 리서치 방법을 분석하고 있어요…"
                    : "추천 리서치 방법을 준비하고 있어요."}
                </p>
              )}
            </div>

            {/* ── CORE 2 · 적합한 조사 인원 ── */}
            <div className="mt-4 rounded-xl border border-border-warm bg-panel px-5 py-5">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-gold">
                CORE 2
              </p>
              <h3 className="mt-1 text-[18px] font-bold text-foreground break-keep">
                누구에게, 얼마나 조사할까?
              </h3>

              <div className="mt-4 space-y-4">
                <div>
                  <p className={stageLabel}>조사 대상 · 권장 인원</p>
                  <p className="mt-1 text-[14px] text-muted break-keep">
                    권장 인원: 최소{" "}
                    <span className="font-semibold text-foreground">
                      {prep.recommendedParticipantCount}명
                    </span>
                    {prep.segments.length ? (
                      <>
                        {" "}
                        · 세그먼트별{" "}
                        {prep.segments
                          .map((s) => `${s.label} ${s.recommendedCount}명`)
                          .join(" · ")}
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1.5 rounded-lg bg-cream/50 px-3 py-2 text-[13px] leading-relaxed text-muted break-keep">
                    <span className="font-medium text-gold">왜 이 인원일까요?</span>{" "}
                    {participantCountReasonText(prep)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="block">
                      <span className={`mb-1.5 block ${stageLabel}`}>
                        최종 조사 인원
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={prep.selectedParticipantCount}
                        disabled={!editable || generating}
                        onChange={(e) => {
                          const n = Math.min(
                            30,
                            Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                          );
                          onChange(
                            updatePrep(data, { selectedParticipantCount: n }),
                          );
                        }}
                        className={`w-28 rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput}`}
                      />
                    </label>
                    {segmentTotal !== prep.selectedParticipantCount &&
                    prep.segments.length ? (
                      <p className={`pb-2 ${stageCaption} text-muted`}>
                        세그먼트 합계 {segmentTotal}명
                      </p>
                    ) : null}
                  </div>
                  {prep.segments.length ? (
                    <ul className="mt-3 space-y-2">
                      {prep.segments.map((seg) => (
                        <li
                          key={seg.id}
                          className="rounded-lg border border-border-warm bg-cream/40 px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[14px] font-semibold text-foreground break-keep">
                              {seg.label}
                              <span className="ml-2 text-[12px] font-medium text-gold">
                                AI 추천
                              </span>
                            </span>
                            <label className="flex items-center gap-2 text-[13px] text-muted">
                              인원
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={seg.selectedCount}
                                disabled={!editable}
                                onChange={(e) => {
                                  const n = Math.min(
                                    20,
                                    Math.max(
                                      0,
                                      Number.parseInt(e.target.value, 10) || 0,
                                    ),
                                  );
                                  onChange(
                                    updatePrep(data, {
                                      segments: prep.segments.map((s) =>
                                        s.id === seg.id
                                          ? { ...s, selectedCount: n }
                                          : s,
                                      ),
                                    }),
                                  );
                                }}
                                className={`w-16 rounded-md border border-border-warm px-2 py-1 text-center ${stageInput}`}
                              />
                            </label>
                          </div>
                          {seg.reason ? (
                            <p className="mt-1 text-[13px] leading-relaxed text-muted break-keep">
                              {seg.reason}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div>
                  <p className={stageLabel}>핵심 조사 내용</p>
                  <p className="mt-1 text-[14px] text-muted break-keep">
                    미래를 묻지 말고, 과거의 실제 행동을 물어보세요.
                  </p>
                  {prep.keyQuestionGuides.length ? (
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-foreground break-keep">
                      {prep.keyQuestionGuides.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              </div>
            </div>

            {/* ── CORE 3 · 어떤 질문들을 해야 할까? (리서치 가이드라인) ── */}
            <div className="mt-4 rounded-xl border border-border-warm bg-panel px-5 py-5">
              <p className="text-[13px] font-semibold uppercase tracking-wide text-gold">
                CORE 3
              </p>
              <h3 className="mt-1 text-[18px] font-bold text-foreground break-keep">
                어떤 질문들을 해야 할까?
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted break-keep">
                현장에서 그대로 참고할 수 있는 리서치 진행 가이드예요. 관찰·인터뷰
                진행 원칙과 시간순 질문 흐름을 확인하고,{" "}
                <strong className="font-semibold text-foreground">
                  이번 프로젝트의 확인 질문(To-know)
                </strong>
                까지 담긴 가이드를 PDF·Word로 내려받아 인쇄해 쓰세요.
              </p>

              {/* 다운로드 버튼 */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void runExport("pdf")}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-1.5 rounded-md bg-spotlight px-3.5 py-2 text-[14px] font-semibold text-on-spotlight transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <IconFileTypePdf className="size-4" stroke={2} aria-hidden />
                  {exporting === "pdf" ? "PDF 만드는 중…" : "PDF로 내려받기"}
                </button>
                <button
                  type="button"
                  onClick={() => void runExport("doc")}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-panel px-3.5 py-2 text-[14px] font-semibold text-foreground transition-colors hover:bg-cream disabled:opacity-50"
                >
                  <IconFileText className="size-4" stroke={2} aria-hidden />
                  Word로 내려받기
                </button>
                <span className={`${stageCaption}`}>
                  확인 질문 {toKnowQuestionCount}개 포함
                </span>
              </div>
              {exportError ? (
                <p className="mt-2 text-[13px] text-rose-600 break-keep">
                  {exportError}
                </p>
              ) : null}

              {/* 인라인 리서치 가이드 (접기/펼치기) */}
              <div className="mt-5 rounded-xl border border-border-warm bg-cream/40 px-4 py-4">
                <button
                  type="button"
                  onClick={() => setGuideExpanded((v) => !v)}
                  aria-expanded={guideExpanded}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="text-[14px] font-bold text-foreground break-keep">
                    리서치 진행 가이드 미리 보기
                  </span>
                  <IconChevronDown
                    className={`size-5 shrink-0 text-muted transition-transform ${
                      guideExpanded ? "rotate-180" : ""
                    }`}
                    stroke={2}
                    aria-hidden
                  />
                </button>
                {guideExpanded ? (
                  <div className="mt-4">
                    <Stage3ResearchGuideContent
                      activeMethod={prep.activeGuideMethod}
                      onMethodChange={(activeGuideMethod) =>
                        onChange(updatePrep(data, { activeGuideMethod }))
                      }
                    />
                  </div>
                ) : null}
              </div>

              {/* 이번 프로젝트 확인 질문 미리 보기 — 대상자별 아코디언 */}
              {toKnowPreviewGroups.length ? (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={stageLabel}>이번 프로젝트에서 확인할 질문</p>
                    <span className={stageCaption}>
                      대상자를 선택하면 질문이 펼쳐져요
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {toKnowPreviewGroups.map((group) => {
                      const open = expandedSubject === group.subject;
                      return (
                        <div
                          key={group.subject}
                          className="overflow-hidden rounded-lg border border-border-warm bg-cream/40"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSubject((prev) =>
                                prev === group.subject ? null : group.subject,
                              )
                            }
                            aria-expanded={open}
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-cream/70"
                          >
                            <span className="text-[13.5px] font-semibold text-foreground break-keep">
                              {group.subject}
                              <span className="ml-2 text-[12px] font-medium text-muted">
                                질문 {group.questions.length}개
                              </span>
                            </span>
                            <IconChevronDown
                              className={`size-5 shrink-0 text-muted transition-transform ${
                                open ? "rotate-180" : ""
                              }`}
                              stroke={2}
                              aria-hidden
                            />
                          </button>
                          {open ? (
                            <ul className="list-disc space-y-1 border-t border-border-warm px-4 py-3 pl-8 text-[13.5px] leading-relaxed text-muted break-keep">
                              {group.questions.map((q, i) => (
                                <li key={`${group.subject}-${i}`}>{q}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
        </ClickSequentialSections>
      </section>

      <div
        className={`${stagePanel} stage-workspace-nav flex flex-wrap items-center justify-between gap-3`}
      >
        <p className={stageCaption}>
          {ready
            ? "조사 계획과 현장 가이드가 준비됐어요. 다음 단계로 진행할 수 있어요."
            : generating
              ? "조사 방법·대상·인원 추천을 생성하고 있어요…"
              : prep.recommendationsGenerated
                ? "리서치 방법·인원을 선택한 뒤 다음 단계로 진행해 주세요."
                : "조사 계획을 확인하고 리서치 방법·인원을 선택해 주세요."}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <WorkspaceBackButton
            projectId={projectId}
            fallbackStageId={2}
            backPageName={getStagePageName(2)}
          />
          <WorkspaceForwardButton
            stageId={4}
            disabled={!ready || saving}
            onClick={onContinue}
          />
        </div>
        <p className="w-full text-[14px] text-muted">
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
  );
}
