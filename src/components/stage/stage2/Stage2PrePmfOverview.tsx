"use client";

import { useUiLocale } from "@/hooks/useUiLocale";

import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { useLocalizedEditable } from "@/hooks/useLocalizedEditable";
import {
  IconExternalLink,
  IconMoon,
  IconSparkles,
} from "@tabler/icons-react";
import { useProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import { StageTwoColumnLayout } from "@/components/stage/StageTwoColumnLayout";
import { usePrePmfLensReveal, PRE_PMF_CANVAS_LENS_STEPS, PRE_PMF_VERDICT_STEP_INDEX, type PrePmfLensLoadingProgress } from "@/hooks/usePrePmfLensReveal";
import type { PrePmfLensCardStatus } from "@/hooks/usePrePmfLensReveal";
import {
  fetchStage2PrePmf,
  saveStage2PrePmf,
} from "@/lib/artifacts/stage2PrePmf";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import type { CoachChatHistoryItem } from "@/lib/coach/chatClient";
import { useDebouncedPersist } from "@/hooks/useDebouncedPersist";
import { useWorkspaceScrollOnEnter } from "@/lib/motion/pageEnterScroll";
import { PrePmfReadableContent } from "@/components/stage/stage2/PrePmfReadableContent";
import {
  composePrePmfSectionBody,
  splitPrePmfSectionTopics,
} from "@/lib/stages/stage2/prePmfReadable";
import { useArchiveView } from "@/lib/archive/archiveViewContext";
import { generatePrePmfOverview } from "@/lib/stages/stage2/generatePrePmfClient";
import { runPrePmfFollowupResearch } from "@/lib/stages/stage2/runPrePmfFollowupClient";
import {
  defaultPrePmfOverview,
  enrichSimilarServiceUrls,
  filterSimilarServiceItemsWithNote,
  prePmfGatePassed,
  prePmfNeedsRegeneration,
  prePmfNextActivityStageLabel,
  prePmfPersonItemFromSentence,
  prePmfPersonValueSentence,
  splitPrePmfPersonValueSentence,
  PRE_PMF_LENS_IDS,
  PRE_PMF_LENS_META,
  PRE_PMF_REPORT_LENS_ORDER,
  resolvePrePmfLensDetail,
  resolvePrePmfLensReportBody,
  prePmfVerdictPathActivities,
  type PrePmfLensDetail,
  type PrePmfLensId,
  type PrePmfNextActivitySuggestion,
  type PrePmfOverviewData,
  type PrePmfPersonItem,
  type PrePmfStatCard,
  type PrePmfTechnologyItem,
  type PrePmfVerdict,
  type PrePmfVerdictDecision,
  type PrePmfVerdictPath,
  type SimilarServiceItem,
} from "@/lib/stages/stage2/prePmfOverview";
import { resolveStage1StartingPoint } from "@/lib/stages/stage1/resolveStartingPoint";
import {
  stageCaption,
  stageCoachEmphasisGold,
  stageLabel,
  stagePanel,
} from "@/lib/stages/ui";

interface Stage2PrePmfOverviewProps {
  projectId: string;
}

function buildIntroMessages(
  problem: string,
  taskFocused: boolean,
): CoachDialogItem[] {
  if (taskFocused) {
    const problemLabel = problem.trim()
      ? `「${problem.trim().slice(0, 60)}${problem.trim().length > 60 ? "…" : ""}」`
      : "입력하신 문제";
    return [
      {
        type: "bubble",
        content: `${problemLabel}로 사전 조사를 시작할게요. 왼쪽 캔버스를 채우고 확인해 주세요.`,
      },
    ];
  }

  return [
    {
      type: "bubble",
      content: problem.trim()
        ? `좋아요. 「${problem.trim().slice(0, 60)}${problem.trim().length > 60 ? "…" : ""}」 내용으로 사전 조사를 해볼게요.`
        : "이제 입력하신 문제·아이디어를 바탕으로 사전 조사를 시작할게요.",
    },
    {
      type: "bubble",
      content:
        "현장 조사에 나가기 전에, 초기 아이디어가 시장에 맞을지(Pre-PMF)를 먼저 점검해요. 문제 정의·타겟·시장·경쟁·유사 서비스·비즈니스 모델을 한눈에 정리해 드려요.",
    },
    {
      type: "highlight",
      label: "이건 가설이에요",
      content:
        "여기 내용은 사전 점검용 가설이에요. 시장·경쟁은 웹 자료로 근거를 붙이지만, 다음 단계의 사용자 조사로 직접 검증해 나가요.",
    },
  ];
}

/** 1단계 문제점 + (레거시) solution → 단일 입력 필드 */
function composePrePmfUserInput(
  startingPoint: string,
  problemStatement: string,
  solution: string,
): string {
  if (problemStatement.trim()) return problemStatement.trim();
  const problem = startingPoint.trim();
  const idea = solution.trim();
  if (problem && idea) return `${problem}\n\n${idea}`;
  return problem || idea;
}

/** 통계 카드 출처 라벨 칩 (URL 없는 텍스트 「출처: …」) */
function SourceLabelChip({ label }: { label: string }) {
  const text = label.trim();
  if (!text) return null;
  const display = /^출처/.test(text) ? text : `출처: ${text}`;
  return (
    <span className="mt-1 inline-flex items-center rounded border border-border-warm bg-cream px-1.5 py-0.5 text-[11px] text-subtle break-keep">
      {display}
    </span>
  );
}

/** 렌즈 로딩 — 진행률·남은 시간 */
function formatLensLoadingEta(
  progress: PrePmfLensLoadingProgress,
): string | null {
  if (progress.percent >= 100) return null;
  if (progress.percent >= 90) return "거의 다 됐어요…";
  if (progress.remainingSec != null) {
    return `예상 남은 시간 약 ${progress.remainingSec}초`;
  }
  return null;
}

function LensLoadingProgressBar({
  progress,
  ariaLabel,
  trackClassName = "bg-cream",
  fillClassName = "bg-spotlight",
}: {
  progress: PrePmfLensLoadingProgress;
  ariaLabel: string;
  trackClassName?: string;
  fillClassName?: string;
}) {
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full ${trackClassName}`}
      role="progressbar"
      aria-valuenow={progress.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-200 ease-out ${fillClassName}`}
        style={{ width: `${progress.percent}%` }}
      />
    </div>
  );
}

/** 렌즈 카드 로딩 스켈레톤 */
function LensLoadingBody({
  label,
  progress,
}: {
  label: string;
  progress: PrePmfLensLoadingProgress;
}) {
  const etaLabel = formatLensLoadingEta(progress);

  return (
    <div className="flex flex-1 flex-col gap-3" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted break-keep">
          <span
            className="inline-flex size-4 shrink-0 animate-spin rounded-full border-2 border-spotlight border-t-transparent"
            aria-hidden
          />
          <span>{label}</span>
        </div>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-gold">
          {progress.percent}%
        </span>
      </div>
      <LensLoadingProgressBar
        progress={progress}
        ariaLabel={label}
        trackClassName="bg-cream"
      />
      {etaLabel ? (
        <p className="text-[12px] text-subtle break-keep">{etaLabel}</p>
      ) : null}
      <div className="space-y-2">
        <div className="h-3 animate-pulse rounded-md bg-cream" />
        <div className="h-3 w-[88%] animate-pulse rounded-md bg-cream" />
        <div className="h-3 w-[62%] animate-pulse rounded-md bg-cream" />
      </div>
    </div>
  );
}

/** Verdict 카드 로딩 (다크 셀) */
function VerdictLoadingBody({
  label,
  progress,
}: {
  label: string;
  progress: PrePmfLensLoadingProgress;
}) {
  const etaLabel = formatLensLoadingEta(progress);

  return (
    <div className="mt-3 flex flex-1 flex-col gap-3" aria-busy="true">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[14px] text-zone-cell-fg-muted break-keep">
          <span
            className="inline-flex size-4 shrink-0 animate-spin rounded-full border-2 border-spotlight border-t-transparent"
            aria-hidden
          />
          <span>{label}</span>
        </div>
        <span className="shrink-0 text-[14px] font-semibold tabular-nums text-spotlight">
          {progress.percent}%
        </span>
      </div>
      <LensLoadingProgressBar
        progress={progress}
        ariaLabel={label}
        trackClassName="bg-white/10"
        fillClassName="bg-spotlight"
      />
      {etaLabel ? (
        <p className="text-[13px] text-zone-cell-fg-muted break-keep">{etaLabel}</p>
      ) : null}
      <div className="space-y-2">
        <div className="h-10 animate-pulse rounded-lg bg-white/10" />
        <div className="h-10 animate-pulse rounded-lg bg-white/10" />
        <div className="h-10 animate-pulse rounded-lg bg-white/8" />
      </div>
    </div>
  );
}

/** 렌즈 하단 — 가설 분류 이유 (레거시, 판정 결과 섹션으로 대체) */
function LensClassificationFooter({ note }: { note: { text: string } }) {
  return (
    <div className="mt-3 rounded-lg border border-spotlight/30 bg-highlight/70 px-3 py-2.5">
      <p className="text-[12.5px] leading-relaxed break-keep">
        <span className="inline-flex items-center gap-1 font-semibold text-gold">
          <IconMoon className="size-3.5 shrink-0" stroke={2} aria-hidden />
          다음 활동 제언
        </span>
        <span className="text-muted"> · </span>
        <span className="text-muted">{note.text}</span>
      </p>
    </div>
  );
}

function splitVerdictRationale(text: string): { headline: string; body: string } {
  const trimmed = text.trim();
  if (!trimmed) return { headline: "", body: "" };
  const lines = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    if (trimmed.length <= 42) return { headline: trimmed, body: "" };
    const sentenceEnd = trimmed.search(/[.!?…](?:\s|$)/);
    if (sentenceEnd > 0 && sentenceEnd <= 56) {
      return {
        headline: trimmed.slice(0, sentenceEnd + 1).trim(),
        body: trimmed.slice(sentenceEnd + 1).trim(),
      };
    }
    return { headline: trimmed.slice(0, 42).trim(), body: trimmed };
  }
  return { headline: lines[0]!, body: lines.slice(1).join("\n") };
}

/** 리포트 항목(1~4) — 직접 편집 + 항목별 AI로 작성 */
function EditableReportLensCard({
  index,
  title,
  eyebrow,
  value,
  onChange,
  onGenerate,
  generating,
  disabled,
  editable,
}: {
  index: number;
  title: string;
  eyebrow: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  generating: boolean;
  disabled: boolean;
  editable: boolean;
}) {
  return (
    <article
      className={`rounded-xl border bg-panel px-5 py-4 shadow-sm transition-colors ${
        generating ? "border-spotlight/40 bg-highlight/20" : "border-border-warm"
      }`}
    >
      <div className="flex gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border-warm bg-cream text-[14px] font-bold text-foreground">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-[16px] font-bold leading-snug text-foreground break-keep">
                {title}
              </h4>
              <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-subtle uppercase">
                {eyebrow}
              </p>
            </div>
            {editable ? (
              <button
                type="button"
                onClick={onGenerate}
                disabled={generating || disabled}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-spotlight bg-panel px-3 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <span
                      className="inline-flex size-3.5 animate-spin rounded-full border-2 border-spotlight border-t-transparent"
                      aria-hidden
                    />
                    작성 중…
                  </>
                ) : (
                  <>
                    <IconSparkles className="size-3.5 text-gold" stroke={2} aria-hidden />
                    AI로 작성하기
                  </>
                )}
              </button>
            ) : null}
          </div>

          <div className="mt-3">
            {editable ? (
              <AutoResizeTextarea
                value={value}
                onChange={onChange}
                disabled={generating}
                minRows={3}
                placeholder="직접 작성하거나 「AI로 작성하기」로 채워 보세요."
              />
            ) : (
              <PrePmfReadableContent
                text={value}
                emptyLabel="아직 정리된 내용이 없어요."
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** @deprecated — 렌즈 카드 사용 */
function LensFieldBlock({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border-warm/80 pt-3 first:border-t-0 first:pt-0">
      <p className="text-[13px] font-semibold text-foreground break-keep">
        {label}
      </p>
      {sublabel ? (
        <p className="mt-0.5 text-[12px] leading-snug text-subtle break-keep">
          {sublabel}
        </p>
      ) : null}
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

function LensDetailBody({
  text,
  emptyLabel = "—",
}: {
  text: string;
  emptyLabel?: string;
}) {
  if (!text.trim()) {
    return <p className="text-[14px] text-subtle break-keep">{emptyLabel}</p>;
  }
  return <PrePmfReadableContent text={text} emptyLabel={emptyLabel} />;
}

/** 5-Lens 렌즈 셀 — 4필드(타겟·행태·시장·판정) */
function ResearchLensCard({
  index,
  title,
  eyebrow,
  detail,
  status,
  loadingLabel,
  loadingProgress,
  targetUsersEditor,
  currentBehaviorEditor,
  marketEnvironmentEditor,
}: {
  index: number;
  title: string;
  eyebrow: string;
  detail: PrePmfLensDetail;
  status: PrePmfLensCardStatus;
  loadingLabel: string;
  loadingProgress?: PrePmfLensLoadingProgress;
  targetUsersEditor?: React.ReactNode;
  currentBehaviorEditor?: React.ReactNode;
  marketEnvironmentEditor?: React.ReactNode;
}) {
  const isLoading = status === "loading";
  const isRevealed = status === "revealed";

  return (
    <section
      className={`relative flex h-full flex-col rounded-2xl border bg-panel p-5 transition-colors ${
        isLoading
          ? "border-spotlight/35 bg-highlight/30"
          : "border-border-warm"
      }`}
    >
      <div className="mb-3 flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded border border-badge-fill-ring bg-badge-fill text-[13px] font-semibold text-badge-initial-fg">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold leading-snug text-foreground break-keep">
            {title}
          </h3>
          <p className="mt-0.5 text-[11.5px] font-semibold tracking-wide text-subtle uppercase">
            {eyebrow}
          </p>
        </div>
      </div>
      {isRevealed ? (
        <div className="min-w-0 flex-1 space-y-1">
          <LensFieldBlock label="타겟 사용자">
            {targetUsersEditor ?? (
              <LensDetailBody text={detail.targetUsers} emptyLabel="타겟 사용자를 정리해 주세요." />
            )}
          </LensFieldBlock>
          <LensFieldBlock
            label="현재 행태"
            sublabel="문제를 푸는 우회로"
          >
            {currentBehaviorEditor ?? (
              <LensDetailBody
                text={detail.currentBehavior}
                emptyLabel="현재 우회로·행태를 정리해 주세요."
              />
            )}
          </LensFieldBlock>
          <LensFieldBlock
            label="시장 환경"
            sublabel="연관 시장 규모, 성장률, 트렌드 등"
          >
            {marketEnvironmentEditor ?? (
              <LensDetailBody
                text={detail.marketEnvironment}
                emptyLabel="연관 시장 환경을 정리해 주세요."
              />
            )}
          </LensFieldBlock>
          <LensFieldBlock label="판정 결과">
            <LensDetailBody
              text={detail.judgmentResult}
              emptyLabel="판정 결과가 아직 없어요."
            />
          </LensFieldBlock>
        </div>
      ) : isLoading ? (
        <LensLoadingBody
          label={loadingLabel}
          progress={loadingProgress ?? { percent: 0, remainingSec: null }}
        />
      ) : (
        <p className="flex-1 text-[14px] leading-relaxed text-subtle break-keep">
          AI로 작성하기를 누르면 타겟 사용자·현재 행태·시장 환경·판정 결과를 채워 드려요.
        </p>
      )}
    </section>
  );
}

/** @deprecated — ResearchLensCard 사용 */
function LensCard({
  index,
  title,
  eyebrow,
  placeholder,
  status,
  loadingLabel,
  loadingProgress,
  footerNote = null,
  children,
}: {
  index: number;
  title: string;
  eyebrow: string;
  placeholder: string;
  status: PrePmfLensCardStatus;
  loadingLabel: string;
  loadingProgress?: PrePmfLensLoadingProgress;
  footerNote?: { text: string } | null;
  children?: React.ReactNode;
}) {
  const isLoading = status === "loading";
  const isRevealed = status === "revealed";

  return (
    <section
      className={`relative flex h-full flex-col rounded-2xl border bg-panel p-5 transition-colors ${
        isLoading
          ? "border-spotlight/35 bg-highlight/30"
          : "border-border-warm"
      }`}
    >
      <div className="mb-3 flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded border border-badge-fill-ring bg-badge-fill text-[13px] font-semibold text-badge-initial-fg">
          {index}
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold leading-snug text-foreground break-keep">
            {title}
          </h3>
          <p className="mt-0.5 text-[11.5px] font-semibold tracking-wide text-subtle uppercase">
            {eyebrow}
          </p>
        </div>
      </div>
      {isRevealed ? (
        <>
          <div className="min-w-0 flex-1">{children}</div>
          {footerNote ? <LensClassificationFooter note={footerNote} /> : null}
        </>
      ) : isLoading ? (
        <LensLoadingBody
          label={loadingLabel}
          progress={loadingProgress ?? { percent: 0, remainingSec: null }}
        />
      ) : (
        <p className="flex-1 text-[14px] leading-relaxed text-subtle break-keep">
          {placeholder}
        </p>
      )}
    </section>
  );
}

/** 필요 기술 항목 카드 */
function TechnologyItemCard({ item }: { item: PrePmfTechnologyItem }) {
  return (
    <li className="rounded-lg border border-border-warm bg-cream px-3 py-2.5">
      <p className="text-[15px] font-semibold text-foreground break-keep">
        {item.name}
      </p>
      {item.note.trim() ? (
        <p className="mt-0.5 text-[14px] leading-relaxed text-muted break-keep">
          {item.note}
        </p>
      ) : null}
    </li>
  );
}

/** 시장 지표 카드 (AI 백필) */
function StatCard({ stat }: { stat: PrePmfStatCard }) {
  return (
    <div className="flex flex-col rounded-lg border border-border-warm bg-cream px-3 py-2.5">
      <span className="text-[12px] text-muted break-keep">{stat.label}</span>
      <span className="mt-0.5 text-[18px] font-bold leading-tight text-foreground break-keep">
        {stat.value || "—"}
      </span>
      <SourceLabelChip label={stat.source} />
    </div>
  );
}

const VERDICT_OPTIONS: {
  decision: Exclude<PrePmfVerdictDecision, "">;
  dot: string;
  title: string;
  sub: string;
}[] = [
  {
    decision: "go",
    dot: "bg-emerald-400",
    title: "지금 바로 실행한다",
    sub: "GO · 실행 단계로",
  },
  {
    decision: "hypothesis_board",
    dot: "bg-amber-400",
    title: "더 검증한 뒤 결정한다",
    sub: "HYPOTHESIS BOARD · 약한 렌즈부터 보강",
  },
  {
    decision: "loop_back",
    dot: "bg-rose-400",
    title: "방향을 다시 잡는다",
    sub: "LOOP-BACK · 공감(Empathize) 단계로",
  },
];

function VerdictActivityList({
  steps,
  compact = false,
}: {
  steps: PrePmfNextActivitySuggestion[];
  compact?: boolean;
}) {
  if (!steps.length) return null;
  return (
    <ul className={`space-y-2 ${compact ? "mt-3" : "mt-2 border-t border-white/10 pt-2"}`}>
      {steps.map((step, i) => (
        <li
          key={`${step.stageId}-${i}`}
          className="flex gap-2 text-[13px] leading-snug break-keep"
        >
          <span
            className="mt-1.5 size-1 shrink-0 rounded-full bg-spotlight"
            aria-hidden
          />
          <span className="text-zone-cell-fg">
            <span className="font-semibold">
              {step.stageId}단계 · {prePmfNextActivityStageLabel(step.stageId)}
            </span>
            <span className="text-zone-cell-fg-muted"> — </span>
            {step.description}
          </span>
        </li>
      ))}
    </ul>
  );
}

function resolveVerdictOption(decision: PrePmfVerdictDecision) {
  const resolved: PrePmfVerdictPath =
    decision === "go" ||
    decision === "hypothesis_board" ||
    decision === "loop_back"
      ? decision
      : "hypothesis_board";
  return (
    VERDICT_OPTIONS.find((opt) => opt.decision === resolved) ??
    VERDICT_OPTIONS[1]!
  );
}

/** Pre-PMF 최종 판정 카드 — 시안 다크 카드 */
function VerdictCard({
  decision,
  rationale,
  verdict,
  status,
  loadingLabel,
  loadingProgress,
}: {
  decision: PrePmfVerdictDecision;
  rationale: string;
  verdict: PrePmfVerdict;
  status: PrePmfLensCardStatus;
  loadingLabel: string;
  loadingProgress?: PrePmfLensLoadingProgress;
}) {
  const isLoading = status === "loading";
  const isRevealed = status === "revealed";
  const selectedOption = resolveVerdictOption(decision);
  const activities = prePmfVerdictPathActivities(verdict, selectedOption.decision);
  const { headline, body } = splitVerdictRationale(rationale);

  return (
    <section
      className={`rounded-2xl bg-zone-cell-bg px-6 py-6 text-zone-cell-fg shadow-md transition-colors ${
        isLoading ? "ring-1 ring-spotlight/40" : ""
      }`}
    >
      {isLoading ? (
        <VerdictLoadingBody
          label={loadingLabel}
          progress={loadingProgress ?? { percent: 0, remainingSec: null }}
        />
      ) : isRevealed ? (
        <>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
            <span className="font-semibold text-zone-cell-fg">최종 판정:</span>
            <span className="font-semibold text-zone-cell-fg">
              {selectedOption.title}
            </span>
            <span
              className={`size-2.5 rounded-full ${selectedOption.dot}`}
              aria-hidden
            />
          </div>
          <p className="mt-1 text-[12px] font-semibold tracking-wide text-zone-cell-fg-muted uppercase break-keep">
            {selectedOption.sub}
          </p>
          {headline ? (
            <h3 className="mt-5 text-[22px] font-bold leading-snug text-zone-cell-fg break-keep">
              {headline}
            </h3>
          ) : null}
          {body ? (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-zone-cell-fg-muted break-keep">
              {body}
            </p>
          ) : null}
          {activities.length ? (
            <>
              <p className="mt-5 text-[13px] font-semibold text-spotlight break-keep">
                &lt; 필요 단계 &gt;
              </p>
              <VerdictActivityList steps={activities} compact />
            </>
          ) : null}
        </>
      ) : (
        <p className="text-[15px] leading-relaxed text-zone-cell-fg-muted break-keep">
          AI가 4개 렌즈를 종합해 최종 판정을 정리해요.
        </p>
      )}
    </section>
  );
}

function isGeminiKeyMissingError(message: string): boolean {
  return message.includes("GEMINI_API_KEY");
}

function PrePmfGenErrorBanner({ message }: { message: string }) {
  const missingKey = isGeminiKeyMissingError(message);
  return (
    <div
      className={`mt-3 rounded-lg border px-3 py-2.5 text-[13px] break-keep ${
        missingKey
          ? "border-amber-200 bg-amber-50 text-foreground"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      <p className={missingKey ? "font-semibold text-amber-950" : undefined}>
        {message}
      </p>
      {missingKey ? (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12.5px] leading-relaxed text-muted">
          <li>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer noopener"
              className="text-gold underline-offset-2 hover:underline"
            >
              Google AI Studio
            </a>
            에서 API 키를 발급합니다.
          </li>
          <li>
            <strong className="font-semibold text-foreground">Vercel 배포</strong>
            : 프로젝트 Settings → Environment Variables →{" "}
            <code className="text-[12px]">GEMINI_API_KEY</code> 추가 (Production ·
            Preview) 후 <code className="text-[12px]">vercel --prod</code>로
            재배포합니다.
          </li>
          <li>
            <strong className="font-semibold text-foreground">로컬 개발</strong>
            : 프로젝트 루트 <code className="text-[12px]">.env.local</code>에{" "}
            <code className="text-[12px]">GEMINI_API_KEY=키값</code>을 넣고{" "}
            <code className="text-[12px]">npm run dev</code>를 다시 실행합니다.
          </li>
        </ol>
      ) : null}
    </div>
  );
}

function PrePmfPersonValueRich({
  sentence,
  item,
}: {
  sentence: string;
  item?: PrePmfPersonItem;
}) {
  const { subject, rest } = splitPrePmfPersonValueSentence(sentence, item);
  if (!subject) {
    return (
      <span className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground break-keep">
        {sentence}
      </span>
    );
  }
  return (
    <span className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground break-keep">
      <span className={stageCoachEmphasisGold}>{subject}</span>
      {rest}
    </span>
  );
}

function PersonItemList({ items }: { items: PrePmfPersonItem[] }) {
  if (!items.length) {
    return <p className={stageCaption}>아직 정리된 내용이 없어요.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const sentence = prePmfPersonValueSentence(item);
        if (!sentence.trim()) return null;
        return (
          <li
            key={`${item.name}-${i}`}
            className="rounded-lg border border-border-warm bg-cream px-3.5 py-3"
          >
            <PrePmfPersonValueRich sentence={sentence} item={item} />
          </li>
        );
      })}
    </ul>
  );
}

const editableFieldClass =
  "w-full rounded-lg border border-border-warm bg-cream px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-subtle focus:border-spotlight/50 disabled:opacity-70";

function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  disabled,
  placeholder,
  minRows = 1,
  className = editableFieldClass,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  minRows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const editable = useLocalizedEditable(value, onChange);
  const { text: localizedPlaceholder } = useLocalizedContent(placeholder ?? "");

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [editable.value, resize]);

  return (
    <textarea
      ref={ref}
      value={editable.value}
      onChange={(e) => {
        editable.onChange(e.target.value);
        requestAnimationFrame(resize);
      }}
      onFocus={editable.onFocus}
      onInput={resize}
      onBlur={() => {
        editable.onBlur();
        onBlur?.();
      }}
      disabled={disabled}
      placeholder={placeholder ? localizedPlaceholder : placeholder}
      rows={minRows}
      className={className}
      data-translating={editable.translating ? "true" : undefined}
      style={{ overflow: "hidden", resize: "none" }}
    />
  );
}

function EditableSectionBody({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <AutoResizeTextarea
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      minRows={2}
    />
  );
}

/** 렌즈 본문 — 주제별 카드 (읽기·편집) */
function SectionTopicPanel({
  text,
  onChange,
  editable: isEditable,
  disabled,
  placeholder,
  emptyLabel = "—",
}: {
  text: string;
  onChange?: (body: string) => void;
  editable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const topics = splitPrePmfSectionTopics(text);
  const displayTopics = topics.length ? topics : isEditable ? [""] : [];

  if (!displayTopics.length) {
    return <p className={stageCaption}>{emptyLabel}</p>;
  }

  if (isEditable && onChange) {
    return (
      <ul className="space-y-2">
        {displayTopics.map((topic, i) => (
          <li
            key={`topic-edit-${i}`}
            className="rounded-lg border border-border-warm bg-cream px-3 py-2.5"
          >
            <AutoResizeTextarea
              value={topic}
              onChange={(next) => {
                const updated = displayTopics.map((t, j) => (j === i ? next : t));
                onChange(composePrePmfSectionBody(updated));
              }}
              disabled={disabled}
              placeholder={placeholder}
              minRows={1}
              className={`${editableFieldClass} -mx-0.5 border-transparent bg-transparent px-0.5 py-0 focus:border-spotlight/50`}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {topics.map((topic, i) => (
        <li
          key={`topic-${i}-${topic.slice(0, 24)}`}
          className="rounded-lg border border-border-warm bg-cream px-3 py-2.5"
        >
          <p className="text-[14px] leading-relaxed text-foreground break-keep">
            {topic}
          </p>
        </li>
      ))}
    </ul>
  );
}

function EditablePersonItemList({
  items,
  onChange,
  disabled,
  placeholder,
}: {
  items: PrePmfPersonItem[];
  onChange: (items: PrePmfPersonItem[]) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const displayItems = items.length ? items : [{ name: "", reason: "" }];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateSentence = (index: number, sentence: string) => {
    onChange(
      displayItems.map((item, i) =>
        i === index ? prePmfPersonItemFromSentence(sentence) : item,
      ),
    );
  };

  const removeAt = (index: number) => {
    const next = displayItems.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ name: "", reason: "" }]);
    setEditingIndex(null);
  };

  return (
    <ul className="space-y-2">
      {displayItems.map((item, i) => {
        const sentence = prePmfPersonValueSentence(item);
        const isEditing =
          editingIndex === i || (!sentence.trim() && !disabled);

        return (
          <li
            key={`person-${i}`}
            className="rounded-lg border border-border-warm bg-cream px-3 py-2.5"
          >
            {isEditing ? (
              <AutoResizeTextarea
                value={sentence}
                onChange={(next) => updateSentence(i, next)}
                onBlur={() => setEditingIndex(null)}
                disabled={disabled}
                placeholder={placeholder}
                minRows={1}
                className={`${editableFieldClass} -mx-0.5 border-transparent bg-transparent px-0.5 py-0 focus:border-spotlight/50`}
              />
            ) : (
              <button
                type="button"
                onClick={() => !disabled && setEditingIndex(i)}
                disabled={disabled}
                className="w-full cursor-text text-left disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sentence.trim() ? (
                  <PrePmfPersonValueRich sentence={sentence} item={item} />
                ) : (
                  <span className="text-[14px] text-subtle">{placeholder}</span>
                )}
              </button>
            )}
            {!isEditing && displayItems.length > 1 ? (
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={disabled}
                className="mt-2 text-[12px] font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                삭제
              </button>
            ) : null}
            {isEditing && displayItems.length > 1 ? (
              <button
                type="button"
                onClick={() => removeAt(i)}
                disabled={disabled}
                className="mt-2 text-[12px] font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
              >
                삭제
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SimilarServiceItemCard({ item }: { item: SimilarServiceItem }) {
  const href = item.url?.trim();
  const cardClass =
    "rounded-lg border border-border-warm bg-cream px-3 py-2 transition-colors";
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span
          className={[
            "text-[15px] font-semibold text-foreground break-keep",
            href ? "underline-offset-2 group-hover:underline" : "",
          ].join(" ")}
        >
          {item.name}
        </span>
        {href ? (
          <IconExternalLink
            className="size-3.5 shrink-0 text-muted"
            stroke={2}
            aria-hidden
          />
        ) : null}
      </div>
      {item.note ? (
        <p className="mt-0.5 text-[14px] leading-relaxed text-muted break-keep">
          {item.note}
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className={`${cardClass} group block cursor-pointer hover:border-spotlight/50 hover:bg-spotlight/5`}
          aria-label={`${item.name} 관련 페이지 열기`}
          title={href}
        >
          {content}
        </a>
      </li>
    );
  }

  return <li className={cardClass}>{content}</li>;
}

export function Stage2PrePmfOverview({ projectId }: Stage2PrePmfOverviewProps) {
  const locale = useUiLocale();
  const router = useRouter();
  const archiveView = useArchiveView();
  const { coachingLevel } = useProjectWorkspace();
  const taskFocused = coachingLevel === "expert";
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [followupLoading, setFollowupLoading] = useState(false);
  const [startingPoint, setStartingPoint] = useState("");
  const [data, setData] = useState<PrePmfOverviewData>(defaultPrePmfOverview());
  const [problemInput, setProblemInput] = useState("");
  const [lensDrafts, setLensDrafts] = useState<
    Partial<Record<PrePmfLensId, string>>
  >({});
  const [lensGenerating, setLensGenerating] = useState<
    Partial<Record<PrePmfLensId, boolean>>
  >({});
  const generateStartedRef = useRef(false);
  const cancelledRef = useRef(false);
  const dataRef = useRef(data);
  const startingPointRef = useRef(startingPoint);
  const genInputRef = useRef("");

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  useEffect(() => {
    startingPointRef.current = startingPoint;
  }, [startingPoint]);

  const lensReveal = usePrePmfLensReveal();

  const reportReady = data.generationStatus === "done";
  const canvasAnimating = generating || lensReveal.isRevealing;
  const displayReport =
    (reportReady && !canvasAnimating) || archiveView;

  useWorkspaceScrollOnEnter(
    displayReport ? "report" : canvasAnimating ? "generating" : "intro",
  );

  useEffect(() => {
    if (loading) return;
    if (archiveView || (reportReady && !generating && !lensReveal.isRevealing)) {
      lensReveal.markAllRevealed();
    }
  }, [
    archiveView,
    generating,
    lensReveal.isRevealing,
    lensReveal.markAllRevealed,
    loading,
    reportReady,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [point, s2] = await Promise.all([
          resolveStage1StartingPoint(projectId),
          fetchStage2PrePmf(projectId),
        ]);
        if (cancelled) return;
        setStartingPoint(point);
        // Deep Research 미사용 시 남은 interactionId는 무시하고 동기 생성으로 다시 시작
        let loaded =
          s2.data.researchInteractionId && s2.data.generationStatus === "loading"
            ? { ...s2.data, researchInteractionId: "", generationStatus: "idle" as const }
            : s2.data;
        // 이전 AI 실패 폴백(템플릿) 또는 1단계 입력 변경 시 재생성
        if (prePmfNeedsRegeneration(loaded, point)) {
          loaded = {
            ...defaultPrePmfOverview(),
            sourceProblem: point,
          };
          generateStartedRef.current = false;
        } else if (loaded.generationStatus === "done") {
          generateStartedRef.current = true;
        }
        const initialInput = composePrePmfUserInput(
          point,
          loaded.problemStatement,
          loaded.solution,
        );
        if (!loaded.problemStatement.trim() && initialInput) {
          loaded = { ...loaded, problemStatement: initialInput };
        }
        setData(loaded);
        setProblemInput(initialInput);
        setArtifactId(s2.artifactId);
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
    async (next: PrePmfOverviewData) => {
      setSaving(true);
      setSaveError(null);
      try {
        const { artifactId: id } = await saveStage2PrePmf({
          projectId,
          artifactId,
          data: next,
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
    enabled: !loading && !canvasAnimating && !archiveView,
    save: saveArtifact,
  });

  const runGeneration = useCallback(async () => {
    if (generateStartedRef.current) return;
    generateStartedRef.current = true;
    cancelledRef.current = false;
    setGenerating(true);
    setGenError(null);
    lensReveal.reset();
    lensReveal.startLoadingCycle();
    const input = genInputRef.current.trim() || startingPoint;
    setData((d) =>
      d.generationStatus === "done"
        ? {
            ...defaultPrePmfOverview(),
            sourceProblem: d.sourceProblem,
            problemStatement: input,
          }
        : d,
    );
    try {
      const overview = await generatePrePmfOverview(input, {
        isCancelled: () => cancelledRef.current,
      });
      if (cancelledRef.current) return;
      const generated: PrePmfOverviewData = {
        ...overview,
        problemStatement: input || overview.problemStatement,
        solution: "",
      };
      const bodies: Partial<Record<PrePmfLensId, string>> = {};
      for (const lensId of PRE_PMF_REPORT_LENS_ORDER) {
        bodies[lensId] = resolvePrePmfLensReportBody(
          lensId,
          generated,
          resolvePrePmfLensDetail(lensId, generated, []),
        );
      }
      generated.lensBodies = bodies;
      setData(generated);
      setLensDrafts(bodies);
      await lensReveal.revealSequentially();
    } catch (e) {
      if (cancelledRef.current) return;
      if (e instanceof Error && e.message === "cancelled") return;
      setGenError(
        e instanceof Error ? e.message : "사전 조사 생성에 실패했습니다.",
      );
      // 실패한 interactionId는 폐기 → 다시 시도 시 새 Deep Research 시작
      setData((d) =>
        d.researchInteractionId
          ? { ...d, researchInteractionId: "" }
          : d,
      );
      generateStartedRef.current = false;
      lensReveal.finishApiWait();
    } finally {
      lensReveal.stopLoadingCycle();
      if (!cancelledRef.current) setGenerating(false);
    }
  }, [lensReveal, startingPoint]);

  const composeGenInput = useCallback(() => {
    return problemInput.trim() || startingPoint.trim();
  }, [problemInput, startingPoint]);

  const handleFillCanvas = useCallback(() => {
    if (generating) return;
    const composed = composeGenInput();
    if (!composed.trim()) return;
    genInputRef.current = composed;
    generateStartedRef.current = false;
    void runGeneration();
  }, [composeGenInput, generating, runGeneration]);

  const handleContinue = useCallback(() => {
    router.push(`/project/${projectId}/stage/3`);
  }, [projectId, router]);

  const stage2InputGuide = useMemo(
    () => getStageWorkInputGuide(2, locale),
    [locale],
  );

  const similarServiceCandidates = useMemo(
    () => [
      ...data.similarServices.sources,
      ...data.marketSize.sources,
      ...data.competitiveLandscape.sources,
    ],
    [
      data.similarServices.sources,
      data.marketSize.sources,
      data.competitiveLandscape.sources,
    ],
  );

  const similarServiceItems = useMemo(
    () =>
      filterSimilarServiceItemsWithNote(
        enrichSimilarServiceUrls(
          data.similarServices.items,
          similarServiceCandidates,
        ),
      ),
    [data.similarServices.items, similarServiceCandidates],
  );

  // 화면에서 보강한 URL을 artifact에도 저장 (재방문 시 링크 유지)
  useEffect(() => {
    if (loading || generating || data.generationStatus !== "done") return;
    if (!data.similarServices.items.length) return;
    if (!similarServiceCandidates.some((s) => s.url.trim())) return;

    const enriched = filterSimilarServiceItemsWithNote(
      enrichSimilarServiceUrls(
        data.similarServices.items,
        similarServiceCandidates,
      ),
    );
    const changed = enriched.some(
      (item, i) =>
        (item.url ?? "") !== (data.similarServices.items[i]?.url ?? ""),
    );
    if (!changed) return;

    setData((prev) => ({
      ...prev,
      similarServices: {
        ...prev.similarServices,
        items: enriched,
      },
    }));
  }, [
    loading,
    generating,
    data.generationStatus,
    data.similarServices.items,
    similarServiceCandidates,
  ]);

  const lensDetails = useMemo(
    () =>
      Object.fromEntries(
        PRE_PMF_LENS_IDS.map((lensId) => [
          lensId,
          resolvePrePmfLensDetail(lensId, data, similarServiceItems),
        ]),
      ) as Record<PrePmfLensId, PrePmfLensDetail>,
    [data, similarServiceItems],
  );

  // 리포트 항목 편집 초안 — 최초 진입 시 저장·파생 본문으로 채움 (이후엔 편집·생성이 우선)
  useEffect(() => {
    if (loading) return;
    setLensDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const lensId of PRE_PMF_REPORT_LENS_ORDER) {
        if (next[lensId] === undefined) {
          next[lensId] = resolvePrePmfLensReportBody(
            lensId,
            data,
            lensDetails[lensId],
          );
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [loading, data, lensDetails]);

  const runLensGeneration = useCallback(
    async (lensId: PrePmfLensId) => {
      const input = problemInput.trim() || startingPoint.trim();
      if (!input) {
        setGenError("먼저 문제점·아이디어를 입력해 주세요.");
        return;
      }
      setGenError(null);
      setLensGenerating((prev) => ({ ...prev, [lensId]: true }));
      try {
        const overview = await generatePrePmfOverview(input, {
          isCancelled: () => false,
        });
        const body = resolvePrePmfLensReportBody(
          lensId,
          overview,
          resolvePrePmfLensDetail(lensId, overview, []),
        );
        setData((d) => ({
          ...d,
          problemStatement: d.problemStatement.trim()
            ? d.problemStatement
            : input,
          sourceProblem: d.sourceProblem.trim() ? d.sourceProblem : input,
          lensBodies: { ...d.lensBodies, [lensId]: body },
          generationStatus: "done",
          generatedAt: new Date().toISOString(),
        }));
        setLensDrafts((prev) => ({ ...prev, [lensId]: body }));
      } catch (e) {
        setGenError(
          e instanceof Error ? e.message : "항목 생성에 실패했습니다.",
        );
      } finally {
        setLensGenerating((prev) => ({ ...prev, [lensId]: false }));
      }
    },
    [problemInput, startingPoint],
  );

  const verdictDecision: PrePmfVerdictDecision = reportReady
    ? data.verdict.decision || "hypothesis_board"
    : data.verdict.decision;

  const handleCoachMessage = useCallback(
    async (message: string, history: CoachChatHistoryItem[]) => {
      setFollowupLoading(true);
      try {
        const result = await runPrePmfFollowupResearch({
          problem: startingPointRef.current,
          overview: dataRef.current,
          userRequest: message,
          conversationHistory: history,
        });
        if (result.overviewUpdated && result.overview) {
          setData(result.overview);
          void saveArtifact(result.overview).catch(() => {
            /* debounced persist가 재시도 */
          });
        }
        return result.coachReply;
      } catch (e) {
        return e instanceof Error
          ? e.message
          : "추가 조사에 실패했습니다. 다시 시도해 주세요.";
      } finally {
        setFollowupLoading(false);
      }
    },
    [saveArtifact],
  );

  const coachMessages = useMemo((): CoachDialogItem[] => {
    if (reportReady) {
      return [
        {
          type: "bubble",
          content:
            "사전 조사 결과를 정리했어요. 왼쪽에서 확인해 보세요.\n\n더 조사하거나 왼쪽 결과에 반영하고 싶은 내용이 있으면 말씀해 주세요. 「왼쪽에 업데이트해 줘」처럼 요청하시면 작업 영역에 바로 반영해 드려요.",
        },
      ];
    }
    if (generating || lensReveal.isRevealing) {
      return [
        {
          type: "bubble",
          content: `${lensReveal.activeLoadingLabel} 잠시만 기다려 주세요.`,
        },
      ];
    }
    return buildIntroMessages(startingPoint, taskFocused);
  }, [generating, lensReveal.activeLoadingLabel, lensReveal.isRevealing, reportReady, startingPoint, taskFocused]);

  const canContinue = !canvasAnimating && prePmfGatePassed(data);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-warm bg-panel px-6 py-12 text-center text-[16px] text-muted">
        사전 조사 자료를 불러오는 중…
      </div>
    );
  }

  const coachPanel = (
    <AnimatedCoachPanel
      sceneKey={`stage-2-${projectId}-${displayReport ? "report" : canvasAnimating ? "generating" : "intro"}`}
      statusLabel={
        followupLoading
          ? "반영 중"
          : displayReport
            ? "짚어주는 중"
            : canvasAnimating
              ? "제안 중"
              : "듣는 중"
      }
      statusSub={
        followupLoading
          ? "왼쪽 정본 반영 중"
          : displayReport
            ? "사전 조사 결과 · 추가 조사·반영"
            : canvasAnimating
              ? "시장 적합성 검토 생성 중"
              : "사전 조사하기"
      }
      messages={coachMessages}
      showComposer={reportReady && !followupLoading}
      onCoachMessage={reportReady ? handleCoachMessage : undefined}
      inputGuide={reportReady ? stage2InputGuide : undefined}
    />
  );

  const editable = !archiveView;

  const anyGenerating =
    canvasAnimating || Object.values(lensGenerating).some(Boolean);

  const workPanel = (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-2">
      <section className={stagePanel}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={stageLabel}>STEP 2 · 사전 조사하기</p>
            <h2 className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.01em] text-foreground">
              시장 적합성 검토
            </h2>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted break-keep">
              고객 문제와 아이디어를 정리하고, 아래 1~4번 항목을 직접
              작성하거나 각 항목의 「AI로 작성하기」로 채워 보세요.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-border-warm bg-cream px-3 py-1 text-[12px] font-medium text-muted">
            {anyGenerating ? "AI 분석 중…" : "AI 준비됨"}
          </span>
        </div>

        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-[16px] font-semibold text-foreground">
            <span className="size-2 rounded-full bg-rose-400" aria-hidden />
            Problem · 내가 정의한 문제점
          </span>
          <AutoResizeTextarea
            value={problemInput}
            onChange={(next) => {
              setProblemInput(next);
              setData((d) => ({ ...d, problemStatement: next, solution: "" }));
            }}
            disabled={!editable || anyGenerating}
            minRows={3}
            placeholder="고객 문제와 생각한 아이디어를 함께 적어 주세요. 예) 주니어 개발자는 코드 리뷰를 받을 시니어가 부족해 성장 피드백을 제때 받지 못한다. AI가 PR을 분석해 시니어 수준의 리뷰 코멘트를 30초 안에 달아주는 협업 봇."
            className="w-full rounded-lg border border-border-warm bg-cream px-3 py-2.5 text-[16px] leading-relaxed text-foreground outline-none placeholder:text-subtle focus:border-spotlight/50 disabled:opacity-70"
          />
          {editable ? (
            <button
              type="button"
              onClick={handleFillCanvas}
              disabled={anyGenerating || !composeGenInput().trim()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-panel px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconSparkles className="size-3.5 text-gold" stroke={2} aria-hidden />
              1~4번 한 번에 AI로 채우기
            </button>
          ) : null}
        </div>

        {genError ? <PrePmfGenErrorBanner message={genError} /> : null}
      </section>

      <div className="space-y-2 text-center">
        <h3 className="text-[18px] font-bold leading-snug text-foreground break-keep">
          <span className="text-gold">AI 기반 사전조사 결과</span>
          <span className="font-semibold text-foreground">
            {" "}
            · 시장 타당성을 분석하는 4가지 렌즈
          </span>
        </h3>
        <p className="mx-auto max-w-2xl text-[13.5px] leading-relaxed text-muted break-keep">
          각 항목을 직접 작성하거나 「AI로 작성하기」로 채워 보세요. 여기
          내용은{" "}
          <strong className="font-semibold text-gold">
            AI 기반 사전조사 가설
          </strong>
          이며, 다음 사용자 조사(현장 검증)로 진짜 데이터로 채워집니다.
        </p>
      </div>

      <div className="space-y-3">
        {PRE_PMF_REPORT_LENS_ORDER.map((lensId, index) => {
          const meta = PRE_PMF_LENS_META[lensId];
          return (
            <EditableReportLensCard
              key={lensId}
              index={index + 1}
              title={meta.title}
              eyebrow={meta.eyebrow}
              value={lensDrafts[lensId] ?? ""}
              onChange={(next) => {
                setLensDrafts((prev) => ({ ...prev, [lensId]: next }));
                setData((d) => ({
                  ...d,
                  lensBodies: { ...d.lensBodies, [lensId]: next },
                }));
              }}
              onGenerate={() => void runLensGeneration(lensId)}
              generating={!!lensGenerating[lensId] || canvasAnimating}
              disabled={anyGenerating}
              editable={editable}
            />
          );
        })}
      </div>

      <VerdictCard
        decision={verdictDecision}
        rationale={data.verdict.rationale}
        verdict={data.verdict}
        status={canvasAnimating ? "loading" : "revealed"}
        loadingLabel={
          PRE_PMF_CANVAS_LENS_STEPS[PRE_PMF_VERDICT_STEP_INDEX]!.loadingLabel
        }
      />

      {editable ? (
        <section className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full rounded-xl bg-charcoal px-6 py-4 text-center text-[17px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            3단계, 사용자 조사 시작하기 →
          </button>
          <div className="flex items-center justify-between gap-3">
            <WorkspaceBackButton projectId={projectId} fallbackStageId={1} />
            <p className="text-[13px] text-muted">
              {saveError
                ? saveError
                : saving
                  ? "저장 중…"
                  : lastSavedAt
                    ? `마지막 저장 ${lastSavedAt}`
                    : "자동 저장됩니다."}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );

  return (
    <StageRevealGroup>
      <div key={reportReady ? "report" : "work"} className="coach-page-enter">
        <StageTwoColumnLayout work={workPanel} coach={coachPanel} />
      </div>
    </StageRevealGroup>
  );
}
