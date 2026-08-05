"use client";

import { IconChevronDown, IconQuote } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  collectSelectionLines,
  composeInterpretationSubQuestion,
  type InterpretationSelection,
} from "@/lib/stages/stage7/hmwInterpretation";
import {
  requestComposeHmwSubQuestion,
  requestHmwInterpretations,
} from "@/lib/stages/stage7/interpretHmwClient";
import type {
  HmwInterpretation,
  HmwInterpretationSlot,
  HmwQuestion,
} from "@/lib/stages/stage7/hmwTypes";
import { containsSolutionNoun } from "@/lib/stages/stage7/hmwQualityChecklist";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  stageBtnSecondary,
  stageCaption,
  stageField,
} from "@/lib/stages/ui";

const IDLE_MS = 90_000;

interface HmwInterpretationAccordionProps {
  projectId: string;
  question: HmwQuestion;
  stage5Data: Stage5LatentNeedsData;
  titleDraft: string;
  descriptionDraft: string;
  forceExpandToken?: number;
  onInterpretationsCached: (interpretations: HmwInterpretation[]) => void;
}

function ChipButton({
  active,
  label,
  hasEvidence,
  onClick,
}: {
  active: boolean;
  label: string;
  hasEvidence?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex max-w-full items-center gap-1 rounded-md border px-2.5 py-1 text-left text-[12px] font-medium break-keep transition-colors",
        active
          ? "border-spotlight bg-highlight text-foreground"
          : "border-border-warm bg-panel text-foreground hover:border-spotlight/40",
      ].join(" ")}
    >
      <span className="min-w-0">{label}</span>
      {hasEvidence ? (
        <IconQuote className="size-3 shrink-0 text-gold" stroke={1.75} />
      ) : null}
    </button>
  );
}

export function HmwInterpretationAccordion({
  projectId,
  question,
  stage5Data,
  titleDraft,
  descriptionDraft,
  forceExpandToken = 0,
  onInterpretationsCached,
}: HmwInterpretationAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localInterpretations, setLocalInterpretations] = useState<
    HmwInterpretation[]
  >(question.interpretations ?? []);
  const [selection, setSelection] = useState<InterpretationSelection>({});
  const [customDraftSlot, setCustomDraftSlot] =
    useState<HmwInterpretationSlot | null>(null);
  const [customText, setCustomText] = useState("");
  const [idleHint, setIdleHint] = useState(false);
  const [subQuestion, setSubQuestion] = useState("");
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    setLocalInterpretations(question.interpretations ?? []);
    setSelection({});
    setError(null);
  }, [question.id, question.hmwText]);

  useEffect(() => {
    if (
      question.interpretations &&
      question.interpretations.length > 0 &&
      localInterpretations.length === 0
    ) {
      setLocalInterpretations(question.interpretations);
    }
  }, [question.interpretations, localInterpretations.length]);

  useEffect(() => {
    if (forceExpandToken > 0) {
      setExpanded(true);
      setIdleHint(true);
    }
  }, [forceExpandToken]);

  useEffect(() => {
    if (titleDraft.trim() || descriptionDraft.trim()) {
      setIdleHint(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setExpanded(true);
      setIdleHint(true);
    }, IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [question.id, titleDraft, descriptionDraft]);

  const subjectName =
    stage5Data.subjects.find((s) => s.id === question.subjectId)?.name ??
    stage5Data.subjects[0]?.name ??
    "";

  const ensureLoaded = async () => {
    if (localInterpretations.length > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const evidenceLines = stage5Data.postits
        .filter(
          (p) =>
            p.text.trim() &&
            (p.kind === "quote" ||
              p.kind === "observation" ||
              p.kind === "latent_need" ||
              p.kind === "finding"),
        )
        .slice(0, 20)
        .map((p) => `[${p.kind}] ${p.text.trim().slice(0, 160)}`);
      const rationaleLines = Object.entries(stage5Data.selectionRationales ?? {})
        .filter(([, text]) => text.trim())
        .slice(0, 6)
        .map(([id, text]) => `${id}: ${text.trim().slice(0, 160)}`);

      const result = await requestHmwInterpretations({
        projectId,
        hmwText: question.hmwText,
        latentNeedText: question.latentNeedText,
        subjectName,
        evidenceLines,
        rationaleLines,
      });
      setLocalInterpretations(result.interpretations);
      onInterpretationsCached(result.interpretations);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "HMW 질문을 구체화하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) void ensureLoaded();
  };

  useEffect(() => {
    if (expanded) void ensureLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when expanded
  }, [expanded]);

  const localDraft = useMemo(
    () =>
      composeInterpretationSubQuestion(
        question.hmwText,
        localInterpretations,
        selection,
      ),
    [question.hmwText, localInterpretations, selection],
  );

  useEffect(() => {
    const lines = collectSelectionLines(localInterpretations, selection);
    if (lines.length === 0) {
      setSubQuestion("");
      setComposing(false);
      return;
    }

    setSubQuestion(localDraft);
    let cancelled = false;
    setComposing(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await requestComposeHmwSubQuestion({
            projectId,
            hmwText: question.hmwText,
            selections: lines,
            fallbackDraft: localDraft,
          });
          if (cancelled) return;
          setSubQuestion(result.subQuestion);
        } catch {
          if (cancelled) return;
          setSubQuestion(localDraft);
        } finally {
          if (!cancelled) setComposing(false);
        }
      })();
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    projectId,
    question.hmwText,
    localInterpretations,
    selection,
    localDraft,
  ]);

  const toggleOption = (slot: HmwInterpretationSlot, optionId: string) => {
    setSelection((prev) => {
      if (prev[slot] === optionId) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return { ...prev, [slot]: optionId };
    });
  };

  const addCustomOption = (slot: HmwInterpretationSlot) => {
    const text = customText.trim();
    if (!text) return;
    if (containsSolutionNoun(text)) {
      setError(
        "해결책 이름(앱·알림·기능 등)은 해석에 넣을 수 없어요. 문제·경험 말로 적어 주세요.",
      );
      return;
    }
    const id = `user-${slot}-${Date.now().toString(36)}`;
    const nextRows = localInterpretations.map((row) => {
      if (row.slot !== slot) return row;
      return {
        ...row,
        options: [
          ...row.options,
          { id, text, isUserAdded: true as const },
        ].slice(0, 6),
      };
    });
    const hasSlot = nextRows.some((r) => r.slot === slot);
    const rows = hasSlot
      ? nextRows
      : [
          ...nextRows,
          {
            slot,
            slotLabel: `${slot}이란?`,
            options: [{ id, text, isUserAdded: true as const }],
          },
        ];
    setLocalInterpretations(rows);
    onInterpretationsCached(rows);
    setSelection((prev) => ({ ...prev, [slot]: id }));
    setCustomDraftSlot(null);
    setCustomText("");
    setError(null);
  };

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gold/35 bg-highlight">
      <div className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className={`mb-1.5 ${stageCaption} text-gold`}>이 칸의 HMW 질문</p>
          <p className="text-base font-semibold leading-relaxed text-foreground break-keep">
            {question.hmwText.trim()}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExpand}
          aria-expanded={expanded}
          className={`${stageBtnSecondary} shrink-0 inline-flex items-center gap-1 text-[11px]`}
        >
          HMW 질문 구체화하기
          <IconChevronDown
            className={[
              "size-3.5 text-muted transition-transform",
              expanded ? "rotate-180" : "",
            ].join(" ")}
            stroke={1.75}
          />
        </button>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-gold/25 bg-cream/40 px-3.5 py-3">
          {idleHint ? (
            <p className={`${stageCaption} text-gold`}>
              Kevin: HMW 질문을 조금 구체화하면 아이디어가 더 쓰기 쉬워져요.
            </p>
          ) : null}

          {loading ? (
            <p className={stageCaption}>HMW 질문을 구체화하는 중…</p>
          ) : null}
          {error ? (
            <p className={`${stageCaption} text-red-600`}>{error}</p>
          ) : null}

          {localInterpretations.map((row) => (
            <div key={row.slot}>
              <p className={`mb-1.5 ${stageCaption}`}>{row.slotLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {row.options.map((opt) => (
                  <ChipButton
                    key={opt.id}
                    active={selection[row.slot] === opt.id}
                    label={opt.text}
                    hasEvidence={Boolean(opt.sourceEvidence?.trim())}
                    onClick={() => toggleOption(row.slot, opt.id)}
                  />
                ))}
                <ChipButton
                  active={customDraftSlot === row.slot}
                  label="직접 쓰기"
                  onClick={() => {
                    setCustomDraftSlot(row.slot);
                    setCustomText("");
                  }}
                />
              </div>
              {customDraftSlot === row.slot ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="내 해석을 짧게"
                    className={`${stageField} min-w-[12rem] flex-1 rounded-md border border-border-warm bg-panel px-2.5 py-1.5 text-[13px]`}
                  />
                  <button
                    type="button"
                    className={`${stageBtnSecondary} text-xs`}
                    onClick={() => addCustomOption(row.slot)}
                  >
                    추가
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          {subQuestion ? (
            <div className="rounded-lg border border-gold/30 bg-panel/80 px-3 py-2.5">
              <p className={`mb-1 ${stageCaption} text-gold`}>
                선택한 조합 → 하위 질문 (참고 · HMW는 그대로)
                {composing ? " · 문장 다듬는 중…" : ""}
              </p>
              <p className="text-sm leading-relaxed text-foreground break-keep">
                {subQuestion}
              </p>
            </div>
          ) : localInterpretations.length > 0 && !loading ? (
            <p className={stageCaption}>
              칩을 골라 조합하면 쓰기 쉬운 하위 질문이 생겨요.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
