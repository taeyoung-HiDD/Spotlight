"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  LocalizedEditableInput,
  LocalizedEditableTextarea,
} from "@/components/i18n/LocalizedEditableField";
import { JourneyEmotionCurve } from "@/components/stage/stage6/JourneyEmotionCurve";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import {
  JOURNEY_BOARD_CONTENT_ROWS,
  JOURNEY_BOARD_PLACEHOLDERS,
  JOURNEY_BOARD_ROW_LABELS,
  zoneDropActivePlaceholder,
  zoneDropPlaceholder,
} from "@/lib/stages/stage6/userJourneyBoardLabels";
import { requestJourneyZoneGeneration } from "@/lib/stages/stage6/generateJourneyZoneClient";
import { buildJourneyEmotionPoints } from "@/lib/stages/stage6/journeyEmotionFromPain";
import { isJourneyAiZone } from "@/lib/stages/stage6/journeyStepZones";
import {
  journeyStepHeaderClass,
  addJourneyStep,
  addManualJourneyPersona,
  addStepAiEntry,
  appendStepAiEntries,
  assignItemToStep,
  getActivePersonaMap,
  journeyItemsForZone,
  parseGeneratedAiEntries,
  poolItems,
  removeJourneyStep,
  removeStepAiEntry,
  returnItemToPool,
  resolveStepAiEntries,
  setActiveSubject,
  journeyItemsForSubject,
  updatePersonaExpectations,
  updateStepAiEntry,
  updateStepLabel,
  JOURNEY_STEP_ZONES,
  type JourneyAiZone,
  type JourneyMapItem,
  type JourneyMapItemKind,
  type JourneyMapStep,
  type JourneyStepZone,
  type UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
import { resolveStepZoneItems } from "@/lib/stages/stage6/journeyStepZones";
import {
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageLabel,
} from "@/lib/stages/ui";

const DRAG_MIME = "application/x-spotlight-journey-item";
/** 왼쪽 행 라벨 — sticky로 좌우 스크롤 시에도 고정 */
const JOURNEY_LABEL_COL = "3.75rem";
/**
 * 여정 단계 열 너비 — 작업 영역에서 대략 3단계가 보이도록 잡고,
 * 칸 안에 카드를 가로 3열로 둘 수 있게 여유를 둡니다.
 */
const JOURNEY_STEP_COL = "16rem";
const JOURNEY_ADD_COL = "4.5rem";

const JOURNEY_GRID_ROW_COUNT = 5;

const ZONE_SURFACE_CLASS: Record<JourneyStepZone, string> = {
  behavior: "user-journey-board__zone--behavior",
  touchpoint: "user-journey-board__zone--touchpoint",
  feeling: "user-journey-board__zone--feeling",
  pain_point: "user-journey-board__zone--pain_point",
};

function stepColumnCellClass(
  zone: JourneyStepZone | "header",
  stepIndex: number,
): string {
  const sides = "border-l border-r border-border-warm bg-panel min-w-0";
  if (zone === "header") {
    return [
      sides,
      "border-t rounded-t-lg",
      journeyStepHeaderClass(stepIndex),
      "user-journey-board__step-header",
    ].join(" ");
  }
  if (zone === "feeling") {
    return `${sides} border-b rounded-b-lg`;
  }
  return sides;
}

const KIND_CHIP: Record<
  JourneyMapItemKind,
  { label: string; className: string }
> = {
  quote: {
    label: "언급",
    className: "border-[#F9A825]/50 bg-[#FFF9C4]/90 text-[#1c1a16]",
  },
  observation: {
    label: "관찰",
    className: "border-[#FB8C00]/40 bg-[#FFE0B2]/90 text-[#1c1a16]",
  },
  latent_need: {
    label: "잠재 니즈",
    className: "border-[#7E57C2]/40 bg-[#EDE7F6]/95 text-[#1c1a16]",
  },
};

const POOL_KIND_TABS: Array<{
  id: "quote" | "observation";
  label: string;
  legendClass: string;
  colorHint: string;
}> = [
  {
    id: "quote",
    label: "언급한 것",
    legendClass: "latent-needs-board__legend latent-needs-board__legend--quote",
    colorHint: "노랑",
  },
  {
    id: "observation",
    label: "관찰한 것",
    legendClass:
      "latent-needs-board__legend latent-needs-board__legend--observation",
    colorHint: "연황",
  },
];

type ItemPlacement = {
  stepId: string;
  stepLabel: string;
  zone: JourneyStepZone;
};

function researchItemsForStepAi(
  data: UserJourneyMapData,
  step: JourneyMapStep,
): JourneyMapItem[] {
  const zoneItems = resolveStepZoneItems(step, data.itemsById);
  const ids = [
    ...new Set([
      ...zoneItems.behavior,
      ...zoneItems.touchpoint,
      ...zoneItems.pain_point,
    ]),
  ];
  return ids
    .map((id) => data.itemsById[id])
    .filter(
      (item): item is JourneyMapItem =>
        Boolean(item) &&
        (item.kind === "quote" || item.kind === "observation") &&
        Boolean(item.text.trim()),
    );
}

function findItemPlacement(
  steps: JourneyMapStep[],
  itemsById: UserJourneyMapData["itemsById"],
  itemId: string,
): ItemPlacement | null {
  for (const step of steps) {
    const zoneItems = resolveStepZoneItems(step, itemsById);
    for (const zone of JOURNEY_STEP_ZONES) {
      if (zoneItems[zone].includes(itemId)) {
        return {
          stepId: step.id,
          stepLabel: step.label.trim() || "여정 단계",
          zone,
        };
      }
    }
  }
  return null;
}

interface UserJourneyBoardProps {
  projectId: string;
  data: UserJourneyMapData;
  onChange: (data: UserJourneyMapData) => void;
}

function readDragItemId(e: React.DragEvent): string | null {
  const id = e.dataTransfer.getData(DRAG_MIME);
  return id || null;
}

function JourneyRowLabelCell({
  row,
}: {
  row: "step" | JourneyStepZone;
}) {
  const config = {
    step: {
      label: JOURNEY_BOARD_ROW_LABELS.step,
      hint: JOURNEY_BOARD_ROW_LABELS.stepHint,
      cellClass:
        "min-h-[4.5rem] items-start border-b border-border-warm/60 pb-1.5 pr-1 pt-1.5",
    },
    behavior: {
      label: JOURNEY_BOARD_ROW_LABELS.behavior,
      hint: JOURNEY_BOARD_ROW_LABELS.behaviorHint,
      cellClass:
        "min-h-[6rem] items-start border-b border-border-warm/60 py-2 pr-1",
    },
    touchpoint: {
      label: JOURNEY_BOARD_ROW_LABELS.touchpoint,
      hint: JOURNEY_BOARD_ROW_LABELS.touchpointHint,
      cellClass:
        "min-h-[6rem] items-start border-b border-border-warm/60 py-2 pr-1",
    },
    pain_point: {
      label: JOURNEY_BOARD_ROW_LABELS.pain_point,
      hint: JOURNEY_BOARD_ROW_LABELS.pain_pointHint,
      cellClass:
        "min-h-[6rem] items-start border-b border-border-warm/60 py-2 pr-1",
    },
    feeling: {
      label: JOURNEY_BOARD_ROW_LABELS.feeling,
      hint: JOURNEY_BOARD_ROW_LABELS.feelingHint,
      cellClass: "min-h-[7.5rem] items-start py-2 pr-1",
    },
  }[row];

  return (
    <div
      className={`user-journey-board__row-labels flex h-full min-w-0 self-stretch ${config.cellClass}`}
      aria-hidden
    >
      <div className="min-w-0 text-left break-keep">
        <p className={`text-[12px] font-semibold user-journey-board__row-label`}>
          {config.label}
        </p>
        <p className="mt-0.5 text-[9px] leading-tight user-journey-board__row-label-hint">
          {config.hint}
        </p>
      </div>
    </div>
  );
}

function JourneyItemChip({
  item,
  index,
  draggable = false,
  onDragStart,
  onDragEnd,
  onRemove,
  isDragging = false,
  placementLabel,
  compact = false,
}: {
  item: JourneyMapItem;
  index?: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  isDragging?: boolean;
  placementLabel?: string;
  /** 여정 칸 3열 그리드용 — 더 조밀한 타이포 */
  compact?: boolean;
}) {
  const meta = KIND_CHIP[item.kind];
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "group relative min-w-0 overflow-hidden rounded-md border font-semibold leading-snug break-keep [overflow-wrap:anywhere]",
        compact
          ? "px-1 py-0.5 text-[10px]"
          : "w-full px-1.5 py-1 text-[11px]",
        meta.className,
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
    >
      <div className="mb-0.5 flex flex-wrap items-center gap-1">
        {typeof index === "number" ? (
          <span className="text-[9px] font-bold opacity-60">{index + 1}.</span>
        ) : null}
        <span className="text-[9px] font-bold opacity-70">{meta.label}</span>
        {placementLabel ? (
          <span className="rounded bg-white/55 px-1 py-px text-[9px] font-medium text-[#1c1a16]/75">
            {placementLabel}
          </span>
        ) : null}
      </div>
      <LocalizedText>{item.text}</LocalizedText>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 rounded px-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/50"
          aria-label="단계에서 제거"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function JourneyStepZoneCell({
  zoneKey,
  zone,
  items,
  aiEntries,
  dropTarget,
  draggingItemId,
  aiGenerating,
  cellClassName,
  onDrop,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onRemove,
  onAiEntryChange,
  onAiEntryAdd,
  onAiEntryRemove,
  onAiGenerate,
  aiContextReady,
}: {
  zoneKey: string;
  zone: JourneyStepZone;
  items: JourneyMapItem[];
  aiEntries?: string[];
  dropTarget: string | null;
  draggingItemId: string | null;
  aiGenerating?: boolean;
  cellClassName?: string;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDragStart: (itemId: string) => (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onRemove: (itemId: string) => void;
  onAiEntryChange?: (index: number, text: string) => void;
  onAiEntryAdd?: () => void;
  onAiEntryRemove?: (index: number) => void;
  onAiGenerate?: () => void;
  aiContextReady?: boolean;
}) {
  const isDropActive = dropTarget === zoneKey;
  const showAi = isJourneyAiZone(zone);
  const hasItems = items.length > 0;
  const entries = aiEntries ?? [];
  const hasAiEntries = entries.length > 0;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        "user-journey-board__zone flex h-full min-h-[6rem] min-w-0 flex-col gap-1.5 p-1.5 transition-colors",
        ZONE_SURFACE_CLASS[zone],
        isDropActive ? "bg-highlight/80" : "",
        cellClassName ?? "",
      ].join(" ")}
    >
      {hasItems ? (
        <div className="user-journey-board__zone-items">
          {items.map((item, itemIndex) => (
            <JourneyItemChip
              key={item.id}
              item={item}
              index={itemIndex}
              draggable
              compact
              isDragging={draggingItemId === item.id}
              onDragStart={onDragStart(item.id)}
              onDragEnd={onDragEnd}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      ) : !showAi || (!hasAiEntries && !aiGenerating) ? (
        <p className="user-journey-board__zone-placeholder px-1 py-3 text-center break-keep [overflow-wrap:anywhere]">
          {isDropActive
            ? zoneDropActivePlaceholder(zone)
            : showAi
              ? JOURNEY_BOARD_PLACEHOLDERS.aiZoneDrop
              : zoneDropPlaceholder(zone)}
        </p>
      ) : null}

      {showAi ? (
        <div
          className={[
            "mt-auto space-y-1.5",
            hasItems || hasAiEntries
              ? "border-t border-border-warm/50 pt-1.5"
              : "",
          ].join(" ")}
        >
          {hasAiEntries ? (
            <div className="user-journey-board__zone-items user-journey-board__zone-entries">
              {entries.map((entry, index) => (
                <div
                  key={`${zoneKey}-entry-${index}`}
                  className="user-journey-board__zone-entry group relative min-w-0"
                >
                  <LocalizedEditableTextarea
                    value={entry}
                    onValueChange={(next) => onAiEntryChange?.(index, next)}
                    rows={3}
                    placeholder={JOURNEY_BOARD_PLACEHOLDERS.aiTextPlaceholder}
                    className="min-h-[3.25rem] w-full min-w-0 resize-y rounded-md border border-border-warm/80 bg-panel px-1.5 py-1 pr-5 text-[11px] leading-relaxed outline-none placeholder:text-subtle focus:border-spotlight/50"
                  />
                  <button
                    type="button"
                    onClick={() => onAiEntryRemove?.(index)}
                    className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-cream hover:text-foreground"
                    aria-label={JOURNEY_BOARD_PLACEHOLDERS.aiEntryRemove}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={onAiEntryAdd}
              className="min-w-0 flex-1 rounded-md border border-dashed border-border-warm bg-panel/80 px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-spotlight/50 hover:bg-highlight/40"
            >
              + {JOURNEY_BOARD_PLACEHOLDERS.aiEntryAdd}
            </button>
            <button
              type="button"
              onClick={onAiGenerate}
              disabled={aiGenerating || !aiContextReady}
              title={
                !aiContextReady
                  ? JOURNEY_BOARD_PLACEHOLDERS.aiNeedsItems
                  : undefined
              }
              className="min-w-0 flex-1 rounded-md border border-border-warm bg-cream px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiGenerating
                ? JOURNEY_BOARD_PLACEHOLDERS.aiGenerating
                : JOURNEY_BOARD_PLACEHOLDERS.aiGenerate}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UserJourneyBoard({
  projectId,
  data,
  onChange,
}: UserJourneyBoardProps) {
  const subjectId = data.activeSubjectId;
  const persona = getActivePersonaMap(data);
  const activeSubject =
    data.subjects.find((s) => s.id === subjectId) ?? data.subjects[0];
  const activeIndex = data.subjects.findIndex((s) => s.id === subjectId);

  const unassigned = subjectId ? poolItems(data, subjectId) : [];
  const subjectSourceItems = subjectId
    ? journeyItemsForSubject(data, subjectId).filter(
        (item) => item.kind === "quote" || item.kind === "observation",
      )
    : [];
  const hasNoSourceData = subjectSourceItems.length === 0;
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [manualPersonaName, setManualPersonaName] = useState("");
  const [poolKindTab, setPoolKindTab] = useState<"quote" | "observation">(
    "quote",
  );

  const [aiGeneratingKey, setAiGeneratingKey] = useState<string | null>(null);

  const poolKindCounts = useMemo(() => {
    const counts = { quote: 0, observation: 0 };
    for (const item of subjectSourceItems) {
      if (item.kind === "quote" || item.kind === "observation") {
        counts[item.kind] += 1;
      }
    }
    return counts;
  }, [subjectSourceItems]);

  useEffect(() => {
    if (poolKindCounts[poolKindTab] > 0) return;
    const next = POOL_KIND_TABS.find((tab) => poolKindCounts[tab.id] > 0);
    if (next) setPoolKindTab(next.id);
  }, [poolKindCounts, poolKindTab, subjectId]);

  const tabbedPoolItems = useMemo(() => {
    if (!persona) {
      return { unassigned: [] as JourneyMapItem[], placed: [] as Array<{
        item: JourneyMapItem;
        placement: ItemPlacement;
      }> };
    }

    const ofKind = subjectSourceItems.filter(
      (item) => item.kind === poolKindTab,
    );
    const unassignedIds = new Set(unassigned.map((item) => item.id));
    const poolOfKind = ofKind.filter((item) => unassignedIds.has(item.id));
    const placedOfKind = ofKind
      .filter((item) => !unassignedIds.has(item.id))
      .map((item) => {
        const placement = findItemPlacement(
          persona.steps,
          data.itemsById,
          item.id,
        );
        return placement ? { item, placement } : null;
      })
      .filter(
        (entry): entry is { item: JourneyMapItem; placement: ItemPlacement } =>
          Boolean(entry),
      );

    return { unassigned: poolOfKind, placed: placedOfKind };
  }, [
    data.itemsById,
    persona,
    poolKindTab,
    subjectSourceItems,
    unassigned,
  ]);

  const stepRows = useMemo(() => {
    if (!persona) return [];
    return persona.steps.map((step, stepIndex) => {
      const zones = Object.fromEntries(
        JOURNEY_STEP_ZONES.map((zone) => [
          zone,
          journeyItemsForZone(data, step, zone),
        ]),
      ) as Record<JourneyStepZone, JourneyMapItem[]>;
      return {
        step,
        stepIndex,
        zones,
        aiTexts: step.aiTexts ?? {},
        aiContextReady: researchItemsForStepAi(data, step).length > 0,
      };
    });
  }, [data, persona]);

  const emotionPoints = useMemo(() => {
    if (!persona) return [];
    return buildJourneyEmotionPoints(persona.steps, data.itemsById);
  }, [data.itemsById, persona]);

  const handleDragStart = useCallback((itemId: string) => {
    return (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME, itemId);
      e.dataTransfer.effectAllowed = "move";
      setDraggingItemId(itemId);
    };
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingItemId(null);
    setDropTarget(null);
  }, []);

  const handleDropOnStep = useCallback(
    (stepId: string, zone: JourneyStepZone) => (e: React.DragEvent) => {
      e.preventDefault();
      if (!subjectId || zone === "feeling") return;
      const itemId = readDragItemId(e);
      if (!itemId) return;
      onChange(assignItemToStep(data, subjectId, itemId, stepId, zone));
      handleDragEnd();
    },
    [data, onChange, handleDragEnd, subjectId],
  );

  const handleAiGenerate = useCallback(
    async (stepId: string, zone: JourneyAiZone) => {
      if (!persona || !subjectId || !activeSubject) return;
      const step = persona.steps.find((s) => s.id === stepId);
      if (!step) return;
      const items = researchItemsForStepAi(data, step);
      if (items.length === 0) return;

      const key = `${stepId}-${zone}`;
      setAiGeneratingKey(key);
      try {
        const result = await requestJourneyZoneGeneration({
          projectId,
          subjectName: activeSubject.name,
          stepLabel: step.label,
          expectations: persona.expectations,
          zone,
          items: items.map((item) => ({ kind: item.kind, text: item.text })),
        });
        onChange(
          appendStepAiEntries(
            data,
            subjectId,
            stepId,
            zone,
            parseGeneratedAiEntries(result.text),
          ),
        );
      } catch {
        // 사용자가 재시도할 수 있도록 조용히 실패
      } finally {
        setAiGeneratingKey((current) => (current === key ? null : current));
      }
    },
    [activeSubject, data, onChange, persona, projectId, subjectId],
  );

  const handleDropOnPool = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!subjectId) return;
      const itemId = readDragItemId(e);
      if (!itemId) return;
      onChange(returnItemToPool(data, subjectId, itemId));
      handleDragEnd();
    },
    [data, onChange, handleDragEnd, subjectId],
  );

  const allowDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(targetId);
  };

  if (!persona || !activeSubject) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-border-warm bg-cream/50 px-5 py-6">
        <p className={stageCaption}>
          4단계에서 조사 대상을 가져올 수도 있고, 여기서 페르소나 이름만
          적고 빈 여정 지도부터 시작할 수도 있어요.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1">
            <span className={`mb-1 block ${stageLabel}`}>페르소나 이름</span>
            <LocalizedEditableInput
              type="text"
              value={manualPersonaName}
              onValueChange={setManualPersonaName}
              placeholder="예: 바쁜 직장인 엄마"
              className={stageField}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              onChange(addManualJourneyPersona(data, manualPersonaName))
            }
            className={stageBtnSecondary}
          >
            여정 지도 시작
          </button>
        </div>
        <Link
          href={`/project/${projectId}/stage/4`}
          className={`${stageCaption} inline-block text-gold underline-offset-2 hover:underline`}
        >
          {JOURNEY_BOARD_PLACEHOLDERS.goToStage4Cta}
        </Link>
      </div>
    );
  }

  const personaLabel = subjectDisplayLabel(
    activeSubject.name,
    activeIndex >= 0 ? activeIndex : 0,
  );

  return (
    <div className="user-journey-board space-y-5">
      {data.subjects.length > 0 ? (
        <div
          className="rounded-lg border border-border-warm/70 bg-cream/30 px-3 py-2.5"
          role="tablist"
          aria-label="페르소나 선택"
        >
          <p className={`mb-2.5 ${stageLabel}`}>페르소나</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {data.subjects.map((subject, idx) => {
              const selected = subjectId === subject.id;
              return (
                <button
                  key={subject.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onChange(setActiveSubject(data, subject.id))}
                  className={[
                    "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[15px] font-semibold transition-colors break-keep",
                    selected
                      ? "border-spotlight bg-spotlight text-on-spotlight"
                      : "border-border-warm bg-cream text-foreground hover:bg-surface",
                  ].join(" ")}
                >
                  <SubjectInitialBadge
                    subject={subject}
                    subjectIndex={idx}
                    showTooltip={false}
                  />
                  {subjectDisplayLabel(subject.name, idx)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border-warm bg-panel">
        <div className="border-b border-border-warm bg-cream/40 px-4 py-3">
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            사용자 여정 지도
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-foreground break-keep">
            {personaLabel}의 여정
          </p>
        </div>

        <div className="grid gap-0 border-b border-border-warm md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="space-y-2 border-b border-border-warm p-4 md:border-b-0 md:border-r">
            <div className="flex min-w-0 items-center gap-2.5">
              <SubjectInitialBadge
                subject={activeSubject}
                subjectIndex={activeIndex >= 0 ? activeIndex : 0}
                size="lg"
                showTooltip={false}
              />
              <p className="min-w-0 text-[16px] font-semibold text-foreground break-keep">
                {personaLabel}
              </p>
            </div>
            <p className={`${stageCaption} break-keep`}>
              {activeSubject.context.trim()
                ? activeSubject.context
                : "4단계, 발견 정리하기에서 작성한 페르소나의 상황이 여기 표시됩니다."}
            </p>
          </div>
          <div className="p-4">
            <label className={`mb-1.5 block ${stageLabel}`}>기대 사항</label>
            <LocalizedEditableTextarea
              value={persona.expectations}
              onValueChange={(text) =>
                onChange(
                  updatePersonaExpectations(
                    data,
                    subjectId,
                    text,
                  ),
                )
              }
              rows={3}
              placeholder="이 페르소나가 여정에서 기대하거나 원하는 것을 적어 보세요."
              className={`w-full resize-y rounded-lg border border-border-warm px-2.5 py-2 text-[13px] leading-relaxed outline-none placeholder:text-subtle focus:border-spotlight/60 ${stageField}`}
            />
          </div>
        </div>

        <div className="user-journey-board__scroll p-2 sm:p-3">
          <p className={`mb-2 px-0.5 ${stageCaption}`}>
            한 화면에 여정 단계 약 3개가 보여요. 좌우로 밀어 나머지 단계를
            확인하고, 칸 안 카드는 가로 최대 3열로 모여요.
          </p>
          <div
            className="user-journey-board__canvas grid gap-x-1.5"
            style={{
              gridTemplateColumns: `${JOURNEY_LABEL_COL} repeat(${stepRows.length}, ${JOURNEY_STEP_COL}) ${JOURNEY_ADD_COL}`,
              gridTemplateRows: `repeat(${JOURNEY_GRID_ROW_COUNT}, auto)`,
            }}
          >
            <JourneyRowLabelCell row="step" />
            {stepRows.map(({ step, stepIndex }) => (
              <div
                key={`${step.id}-header`}
                className={`${stepColumnCellClass("header", stepIndex)} flex min-h-[4.5rem] h-full items-center gap-1 px-1.5 py-2`}
              >
                <LocalizedEditableInput
                  type="text"
                  value={step.label}
                  onValueChange={(label) =>
                    onChange(
                      updateStepLabel(
                        data,
                        subjectId,
                        step.id,
                        label,
                      ),
                    )
                  }
                  placeholder={JOURNEY_BOARD_PLACEHOLDERS.stepName}
                  className="user-journey-board__step-input min-h-8 min-w-0 flex-1 rounded-md border border-border-warm/80 px-1.5 py-1 text-center text-[13px] font-semibold leading-snug outline-none placeholder:text-subtle focus:border-spotlight/50"
                  aria-label="여정 단계 이름"
                />
                {persona.steps.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange(removeJourneyStep(data, subjectId, step.id))
                    }
                    className="user-journey-board__step-remove flex size-7 shrink-0 items-center justify-center rounded-md border border-border-warm/80 bg-panel transition-colors"
                    aria-label={`${step.label} 단계 삭제`}
                  >
                    <IconTrash className="size-3" stroke={2} />
                  </button>
                ) : null}
              </div>
            ))}

            {JOURNEY_BOARD_CONTENT_ROWS.map((zone) => {
              if (zone === "feeling") {
                return (
                  <Fragment key={zone}>
                    <JourneyRowLabelCell row="feeling" />
                    <div
                      className={[
                        "user-journey-board__zone user-journey-board__zone--feeling border-l border-r border-b border-border-warm bg-panel min-w-0 rounded-b-lg",
                      ].join(" ")}
                      style={{
                        gridColumn: `2 / ${stepRows.length + 2}`,
                      }}
                    >
                      <JourneyEmotionCurve points={emotionPoints} />
                    </div>
                  </Fragment>
                );
              }

              return (
                <Fragment key={zone}>
                  <JourneyRowLabelCell row={zone} />
                  {stepRows.map(
                    ({ step, stepIndex, zones, aiContextReady }) => (
                    <JourneyStepZoneCell
                      key={`${step.id}-${zone}`}
                      zoneKey={`${step.id}-${zone}`}
                      zone={zone}
                      items={zones[zone]}
                      aiEntries={
                        isJourneyAiZone(zone)
                          ? resolveStepAiEntries(step, zone)
                          : undefined
                      }
                      dropTarget={dropTarget}
                      draggingItemId={draggingItemId}
                      aiGenerating={aiGeneratingKey === `${step.id}-${zone}`}
                      cellClassName={stepColumnCellClass(zone, stepIndex)}
                      onDrop={handleDropOnStep(step.id, zone)}
                      onDragOver={allowDrop(`${step.id}-${zone}`)}
                      onDragLeave={() =>
                        setDropTarget((current) =>
                          current === `${step.id}-${zone}` ? null : current,
                        )
                      }
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onRemove={(itemId) =>
                        onChange(returnItemToPool(data, subjectId, itemId))
                      }
                      onAiEntryChange={
                        isJourneyAiZone(zone)
                          ? (index, text) =>
                              onChange(
                                updateStepAiEntry(
                                  data,
                                  subjectId,
                                  step.id,
                                  zone,
                                  index,
                                  text,
                                ),
                              )
                          : undefined
                      }
                      onAiEntryAdd={
                        isJourneyAiZone(zone)
                          ? () =>
                              onChange(
                                addStepAiEntry(
                                  data,
                                  subjectId,
                                  step.id,
                                  zone,
                                ),
                              )
                          : undefined
                      }
                      onAiEntryRemove={
                        isJourneyAiZone(zone)
                          ? (index) =>
                              onChange(
                                removeStepAiEntry(
                                  data,
                                  subjectId,
                                  step.id,
                                  zone,
                                  index,
                                ),
                              )
                          : undefined
                      }
                      onAiGenerate={
                        isJourneyAiZone(zone)
                          ? () => void handleAiGenerate(step.id, zone)
                          : undefined
                      }
                      aiContextReady={aiContextReady}
                    />
                  ),
                  )}
                </Fragment>
              );
            })}

            <button
              type="button"
              onClick={() => onChange(addJourneyStep(data, subjectId))}
              className={[
                "flex min-w-0 flex-col items-center justify-center gap-1.5 self-stretch rounded-lg border border-dashed border-border-warm bg-cream/20 px-1.5 py-4 text-muted transition-colors",
                "hover:border-spotlight/50 hover:bg-highlight/50 hover:text-foreground",
              ].join(" ")}
              style={{
                gridColumn: stepRows.length + 2,
                gridRow: `1 / ${JOURNEY_GRID_ROW_COUNT + 1}`,
              }}
              aria-label="여정 단계 추가"
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-border-warm bg-panel">
                <IconPlus className="size-4" stroke={2} />
              </span>
              <span className="text-center text-[11px] font-semibold leading-tight break-keep [overflow-wrap:anywhere]">
                단계
                <br />
                추가
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        onDragOver={allowDrop("pool")}
        onDragLeave={() =>
          setDropTarget((current) => (current === "pool" ? null : current))
        }
        onDrop={handleDropOnPool}
        className={[
          "rounded-xl border px-3 py-3 transition-colors",
          dropTarget === "pool"
            ? "border-spotlight/70 bg-highlight/60"
            : "border-border-warm bg-cream/30",
        ].join(" ")}
        role="tablist"
        aria-label="조사·니즈 유형"
      >
        <p className={`mb-2 ${stageLabel}`}>
          {personaLabel} · 조사·니즈 카드
        </p>
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {POOL_KIND_TABS.map((tab) => {
            const selected = poolKindTab === tab.id;
            const count = poolKindCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setPoolKindTab(tab.id)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[14px] font-semibold transition-colors break-keep",
                  selected
                    ? "border-spotlight bg-spotlight text-on-spotlight"
                    : tab.legendClass,
                ].join(" ")}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    "rounded px-1 py-px text-[12px] font-medium tabular-nums",
                    selected
                      ? "bg-on-spotlight/15 text-on-spotlight"
                      : "bg-panel/80 text-muted",
                  ].join(" ")}
                >
                  {count}
                </span>
                {!selected ? (
                  <span className="latent-needs-board__legend-muted text-[12px] font-medium">
                    · {tab.colorHint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className={`mb-3 ${stageCaption}`}>
          유형 탭으로 나눠 확인할 수 있어요. 카드를 여정 단계로 드래그해
          위치를 다듬거나, 여기에 놓아 배치를 풀어 둘 수 있어요.
        </p>
        {hasNoSourceData ? (
          <div className="space-y-3">
            <p className={`${stageCaption} break-keep`}>
              {JOURNEY_BOARD_PLACEHOLDERS.poolNoSourceData}
            </p>
            <Link
              href={`/project/${projectId}/stage/4`}
              className={`${stageBtnSecondary} inline-flex`}
            >
              {JOURNEY_BOARD_PLACEHOLDERS.goToStage4Cta}
            </Link>
          </div>
        ) : tabbedPoolItems.unassigned.length === 0 &&
          tabbedPoolItems.placed.length === 0 ? (
          <p className={stageCaption}>
            이 유형의 카드가 아직 없어요.
          </p>
        ) : (
          <div className="space-y-3" role="tabpanel">
            {draggingItemId ? (
              <p className={stageCaption}>
                여기에 놓으면 배치 전 풀로 돌아가요
              </p>
            ) : null}

            {tabbedPoolItems.unassigned.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[12px] font-semibold text-muted">
                  배치 전 · {tabbedPoolItems.unassigned.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tabbedPoolItems.unassigned.map((item) => (
                    <div
                      key={item.id}
                      className="w-[min(100%,11.5rem)] shrink-0"
                    >
                      <JourneyItemChip
                        item={item}
                        draggable
                        isDragging={draggingItemId === item.id}
                        onDragStart={handleDragStart(item.id)}
                        onDragEnd={handleDragEnd}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className={stageCaption}>
                이 유형은 모두 여정 단계에 배치됐어요. 아래 카드로 확인하거나
                위치를 다시 옮겨 보세요.
              </p>
            )}

            {tabbedPoolItems.placed.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[12px] font-semibold text-muted">
                  여정에 배치됨 · {tabbedPoolItems.placed.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tabbedPoolItems.placed.map(({ item, placement }) => (
                    <div
                      key={item.id}
                      className="w-[min(100%,11.5rem)] shrink-0"
                    >
                      <JourneyItemChip
                        item={item}
                        draggable
                        placementLabel={placement.stepLabel}
                        isDragging={draggingItemId === item.id}
                        onDragStart={handleDragStart(item.id)}
                        onDragEnd={handleDragEnd}
                        onRemove={
                          subjectId
                            ? () =>
                                onChange(
                                  returnItemToPool(data, subjectId, item.id),
                                )
                            : undefined
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
