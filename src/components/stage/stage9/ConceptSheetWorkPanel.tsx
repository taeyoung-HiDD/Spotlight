"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useCallback, useState, type ReactNode } from "react";
import {
  LocalizedEditableInput,
  LocalizedEditableTextarea,
} from "@/components/i18n/LocalizedEditableField";
import {
  requestSlotBackfill,
  requestStoryboardImage,
} from "@/lib/ai/client/stageAiClient";
import {
  isConceptSheetReadyForStoryboard,
  STORYBOARD_CUT_COUNT,
  type ConceptSheetData,
  type StoryboardCut,
} from "@/lib/stages/stage9/conceptSheetTypes";
import { buildStoryboardOverlay } from "@/lib/stages/stage9/storyboardOverlay";
import { StoryboardCard } from "@/components/stage/stage9/StoryboardCard";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
  stageTextarea,
  stageWorkMeta,
  stageWorkMicro,
} from "@/lib/stages/ui";

type BackfillKey =
  | "conceptName"
  | "oneLiner"
  | "feature0"
  | "feature1"
  | "feature2"
  | "trueNeed";

const BACKFILL_SLOTS: Record<
  BackfillKey,
  { slotKey: string; slotLabel: string }
> = {
  conceptName: { slotKey: "concept_name", slotLabel: "컨셉 이름" },
  oneLiner: { slotKey: "one_liner", slotLabel: "한 줄 설명" },
  feature0: { slotKey: "feature_1", slotLabel: "핵심 기능 1" },
  feature1: { slotKey: "feature_2", slotLabel: "핵심 기능 2" },
  feature2: { slotKey: "feature_3", slotLabel: "핵심 기능 3" },
  trueNeed: { slotKey: "true_need", slotLabel: "해결하는 진짜 동기" },
};

interface ConceptSheetWorkPanelProps {
  projectId: string;
  data: ConceptSheetData;
  onChange: (next: ConceptSheetData) => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

function HypothesisBadge() {
  return (
    <span className="rounded bg-cream px-1.5 py-0.5 text-[11px] font-medium text-gold">
      가설
    </span>
  );
}

export function ConceptSheetWorkPanel({
  projectId,
  data,
  onChange,
  saving,
  saveError,
  lastSavedAt,
}: ConceptSheetWorkPanelProps) {
  const [backfilling, setBackfilling] = useState<BackfillKey | null>(null);
  const [generatingCut, setGeneratingCut] = useState<number | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const artifactSummary = [
    data.conceptName && `컨셉: ${data.conceptName}`,
    data.oneLiner && `설명: ${data.oneLiner}`,
    data.trueNeed && `니즈: ${data.trueNeed}`,
  ]
    .filter(Boolean)
    .join("\n");

  const handleBackfill = useCallback(
    async (key: BackfillKey) => {
      setAiError(null);
      setBackfilling(key);
      try {
        const slot = BACKFILL_SLOTS[key];
        const result = await requestSlotBackfill({
          stageId: 10,
          stageTitle: "컨셉 정리하기",
          slotKey: slot.slotKey,
          slotLabel: slot.slotLabel,
          artifactSummary,
        });
        const next = { ...data };
        if (key === "conceptName") next.conceptName = result.content;
        else if (key === "oneLiner") next.oneLiner = result.content;
        else if (key === "trueNeed") next.trueNeed = result.content;
        else if (key === "feature0") next.features = [result.content, next.features[1], next.features[2]];
        else if (key === "feature1") next.features = [next.features[0], result.content, next.features[2]];
        else if (key === "feature2") next.features = [next.features[0], next.features[1], result.content];
        onChange(next);
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "백필에 실패했습니다.");
      } finally {
        setBackfilling(null);
      }
    },
    [artifactSummary, data, onChange],
  );

  const generateCutImage = useCallback(
    async (cut: StoryboardCut): Promise<StoryboardCut> => {
      if (!cut.caption.trim()) return cut;
      const result = await requestStoryboardImage({
        projectId,
        conceptName: data.conceptName.trim() || "컨셉",
        cutIndex: cut.index,
        cutCaption: cut.caption,
        userNeed: data.trueNeed,
        personaContext: data.trueNeedQuote,
        isFinale: cut.index === STORYBOARD_CUT_COUNT,
      });
      return {
        ...cut,
        imageUrl: result.imageUrl,
        imageSource: "gemini",
      };
    },
    [data.conceptName, data.trueNeed, data.trueNeedQuote, projectId],
  );

  const handleGenerateAll = useCallback(async () => {
    if (!isConceptSheetReadyForStoryboard(data)) {
      setAiError("4 필드를 먼저 채워 주세요.");
      return;
    }
    const missingCaption = data.storyboardCuts.some((c) => !c.caption.trim());
    if (missingCaption) {
      setAiError("스토리보드 5컷 문장을 모두 입력해 주세요.");
      return;
    }

    setAiError(null);
    setGeneratingAll(true);
    try {
      let nextCuts = [...data.storyboardCuts];
      for (const cut of nextCuts) {
        setGeneratingCut(cut.index);
        const updated = await generateCutImage(cut);
        nextCuts = nextCuts.map((c) =>
          c.index === updated.index ? updated : c,
        );
        onChange({ ...data, storyboardCuts: nextCuts });
      }
    } catch (e) {
      setAiError(
        e instanceof Error ? e.message : "스토리보드 생성에 실패했습니다.",
      );
    } finally {
      setGeneratingCut(null);
      setGeneratingAll(false);
    }
  }, [data, generateCutImage, onChange]);

  const handleRegenerateCut = useCallback(
    async (index: number) => {
      const cut = data.storyboardCuts.find((c) => c.index === index);
      if (!cut?.caption.trim()) return;
      setAiError(null);
      setGeneratingCut(index);
      try {
        const updated = await generateCutImage(cut);
        onChange({
          ...data,
          storyboardCuts: data.storyboardCuts.map((c) =>
            c.index === index ? updated : c,
          ),
        });
      } catch (e) {
        setAiError(
          e instanceof Error ? e.message : "이미지 생성에 실패했습니다.",
        );
      } finally {
        setGeneratingCut(null);
      }
    },
    [data, generateCutImage, onChange],
  );

  const updateCutCaption = (index: number, caption: string) => {
    onChange({
      ...data,
      storyboardCuts: data.storyboardCuts.map((c) =>
        c.index === index ? { ...c, caption } : c,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <section className={stagePanel}>
        <h2 className={stageSectionTitle}>컨셉 시트</h2>
        <p className={`mt-1 mb-5 ${stageSectionLead}`}>
          4 필드 작성 후 AI 스토리보드 5컷 생성 · 단계 10 시제품의 출발점
        </p>

        <div className="space-y-4">
          <FieldBlock
            label="1 · 컨셉 이름"
            onBackfill={() => void handleBackfill("conceptName")}
            backfilling={backfilling === "conceptName"}
            showBackfill={!data.conceptName.trim()}
          >
            <LocalizedEditableInput
              className={`w-full rounded-lg border border-border-warm px-3 py-2.5 ${stageField} ${stageInput}`}
              value={data.conceptName}
              onValueChange={(conceptName) =>
                onChange({ ...data, conceptName })
              }
              placeholder="예: 안심 매대"
            />
          </FieldBlock>

          <FieldBlock
            label="2 · 한 줄 설명"
            onBackfill={() => void handleBackfill("oneLiner")}
            backfilling={backfilling === "oneLiner"}
            showBackfill={!data.oneLiner.trim()}
          >
            <LocalizedEditableTextarea
              className={`min-h-[72px] w-full resize-y rounded-lg border border-border-warm px-3 py-2.5 ${stageField} ${stageTextarea}`}
              value={data.oneLiner}
              onValueChange={(oneLiner) => onChange({ ...data, oneLiner })}
              placeholder="누구에게 무엇을 해주는지 한 문장으로"
            />
          </FieldBlock>

          <div>
            <p className={`mb-2 ${stageLabel}`}>3 · 핵심 기능 3종</p>
            <div className="space-y-2">
              {data.features.map((feature, i) => {
                const key = `feature${i}` as BackfillKey;
                return (
                  <FieldBlock
                    key={key}
                    label={`기능 ${i + 1}`}
                    compact
                    onBackfill={() => void handleBackfill(key)}
                    backfilling={backfilling === key}
                    showBackfill={!feature.trim()}
                  >
                    <LocalizedEditableInput
                      className={`w-full rounded-lg border border-border-warm px-3 py-2.5 ${stageField} ${stageInput}`}
                      value={feature}
                      onValueChange={(next) => {
                        const features = [...data.features] as [
                          string,
                          string,
                          string,
                        ];
                        features[i] = next;
                        onChange({ ...data, features });
                      }}
                      placeholder={`핵심 기능 ${i + 1}`}
                    />
                  </FieldBlock>
                );
              })}
            </div>
          </div>

          <FieldBlock
            label="4 · 해결하는 진짜 동기"
            badge={<HypothesisBadge />}
            onBackfill={() => void handleBackfill("trueNeed")}
            backfilling={backfilling === "trueNeed"}
            showBackfill={!data.trueNeed.trim()}
          >
            <LocalizedEditableTextarea
              className={`min-h-[72px] w-full resize-y rounded-lg border border-spotlight/40 bg-[#FFFDF4] px-3 py-2.5 ${stageTextarea} text-foreground`}
              value={data.trueNeed}
              onValueChange={(trueNeed) => onChange({ ...data, trueNeed })}
              placeholder="6단계 잠재 니즈에서 자동 연결됩니다"
            />
            {data.trueNeedQuote ? (
              <p className={`mt-2 border-l-2 border-spotlight pl-2 italic ${stageWorkMeta}`}>
                「{data.trueNeedQuote}」
              </p>
            ) : null}
          </FieldBlock>
        </div>
      </section>

      <section className="rounded-2xl border-[1.5px] border-spotlight bg-panel p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <IconSparkles className="size-4 text-gold" stroke={2} aria-hidden />
              <h3 className={stageSectionTitle}>AI 스토리보드 · 5컷</h3>
              <HypothesisBadge />
            </div>
            <p className={`mt-1 ${stageWorkMeta}`}>
              차콜선 + 흰 배경 + 노랑 강조 · AI 배경 + 한글 오버레이
            </p>
          </div>
          <button
            type="button"
            className={`${stageBtnPrimary} inline-flex items-center gap-1.5`}
            disabled={generatingAll || !isConceptSheetReadyForStoryboard(data)}
            onClick={() => void handleGenerateAll()}
          >
            <IconSparkles className="size-4" stroke={2} aria-hidden />
            {generatingAll
              ? `생성 중 (${generatingCut ?? "…"}/5)`
              : "AI 스토리보드 생성"}
          </button>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_2fr]">
          {data.storyboardCuts.map((cut) => {
            const isFinale = cut.index === STORYBOARD_CUT_COUNT;
            return (
              <div key={cut.index}>
                <p className={`mb-1.5 ${stageWorkMicro} font-medium text-gold`}>
                  컷 {cut.index}
                  {isFinale ? " · 체험 도착점" : ""}
                </p>
                <LocalizedEditableTextarea
                  className={`mb-2 min-h-[64px] w-full resize-y rounded-lg border border-border-warm px-2.5 py-2 ${stageField} ${stageTextarea} text-[15px]`}
                  value={cut.caption}
                  onValueChange={(caption) =>
                    updateCutCaption(cut.index, caption)
                  }
                  placeholder={`${cut.index}번 장면 설명`}
                />
                <StoryboardCard
                  cutIndex={cut.index}
                  isFinale={isFinale}
                  imageUrl={cut.imageUrl}
                  overlay={buildStoryboardOverlay(cut, data)}
                  generating={generatingCut === cut.index}
                />
                <button
                  type="button"
                  className={`${stageBtnSecondary} mt-2 w-full text-[13px]`}
                  disabled={generatingAll || generatingCut !== null || !cut.caption.trim()}
                  onClick={() => void handleRegenerateCut(cut.index)}
                >
                  이 컷 다시 생성
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <p className={stageCaption}>
        {saving
          ? "저장 중…"
          : lastSavedAt
            ? `자동 저장 · ${lastSavedAt}`
            : "변경 시 자동 저장"}
        {saveError ? ` · ${saveError}` : ""}
        {aiError ? ` · ${aiError}` : ""}
      </p>
    </div>
  );
}

function FieldBlock({
  label,
  children,
  onBackfill,
  backfilling,
  showBackfill,
  compact,
  badge,
}: {
  label: string;
  children: ReactNode;
  onBackfill?: () => void;
  backfilling?: boolean;
  showBackfill?: boolean;
  compact?: boolean;
  badge?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className={compact ? stageWorkMeta : stageLabel}>
          {label}
          {badge ? <span className="ml-2">{badge}</span> : null}
        </p>
        {showBackfill && onBackfill ? (
          <button
            type="button"
            className="text-[13px] font-medium text-gold hover:underline"
            disabled={backfilling}
            onClick={onBackfill}
          >
            {backfilling ? "채우는 중…" : "AI로 채우기"}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}
