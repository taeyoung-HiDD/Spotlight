"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { LocalizedEditableTextarea } from "@/components/i18n/LocalizedEditableField";
import {
  ExpandableJourneyPostit,
  useJourneyPostitExpansion,
} from "@/components/stage/shared/ExpandableJourneyPostit";
import { JourneyEmotionCurve } from "@/components/stage/stage6/JourneyEmotionCurve";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import {
  assignLatentNeedToStep,
  bootstrapLatentNeedsOntoJourney,
  poolLatentNeedPostits,
  returnLatentNeedToPool,
  stepLatentNeedPostits,
} from "@/lib/stages/stage5/latentNeedsJourneyPlacement";
import {
  createStage5BoardPostit,
  type Stage5BoardPostit,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { buildJourneyEmotionPoints } from "@/lib/stages/stage6/journeyEmotionFromPain";
import {
  JOURNEY_BOARD_PLACEHOLDERS,
  JOURNEY_BOARD_ROW_LABELS,
} from "@/lib/stages/stage6/userJourneyBoardLabels";
import {
  isJourneyAiZone,
  resolveStepAiEntries,
} from "@/lib/stages/stage6/journeyStepZones";
import {
  getActivePersonaMap,
  journeyItemsForZone,
  journeyStepHeaderClass,
  setActiveSubject,
  type JourneyMapItem,
  type JourneyStepZone,
  type UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
import {
  stageBtnSecondary,
  stageCaption,
  stageLabel,
} from "@/lib/stages/ui";

const DRAG_MIME = "application/x-spotlight-latent-need";
const JOURNEY_LABEL_COL = "3.75rem";
const JOURNEY_STEP_COL = "16rem";
const JOURNEY_GRID_ROW_COUNT = 6;

const READONLY_ZONES: JourneyStepZone[] = [
  "behavior",
  "touchpoint",
  "pain_point",
];

function stepColumnCellClass(
  zone: JourneyStepZone | "header" | "needs",
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
  if (zone === "needs") {
    return `${sides} border-b rounded-b-lg`;
  }
  return sides;
}

function ReadonlyChip({
  item,
  index,
  large = false,
}: {
  item: JourneyMapItem;
  index: number;
  large?: boolean;
}) {
  const kindLabel =
    item.kind === "quote"
      ? "언급"
      : item.kind === "observation"
        ? "관찰"
        : item.kind === "latent_need"
          ? "잠재 니즈"
          : "조사";
  const kindClass =
    item.kind === "quote"
      ? "border-[#F9A825]/50 bg-[#FFF9C4]/90"
      : item.kind === "observation"
        ? "border-[#FB8C00]/40 bg-[#FFE0B2]/90"
        : "border-[#7E57C2]/40 bg-[#EDE7F6]/95";

  return (
    <div
      className={[
        "min-w-0 overflow-hidden rounded-md border font-semibold break-keep [overflow-wrap:anywhere] text-[#1c1a16]",
        kindClass,
        large
          ? "px-3 py-2.5 text-[15px] leading-relaxed"
          : "px-1 py-0.5 text-[10px] leading-snug",
      ].join(" ")}
    >
      <div className="mb-0.5 flex items-center gap-1">
        <span
          className={[
            "font-bold opacity-60",
            large ? "text-[12px]" : "text-[9px]",
          ].join(" ")}
        >
          {index + 1}.
        </span>
        <span
          className={[
            "font-bold opacity-70",
            large ? "text-[12px]" : "text-[9px]",
          ].join(" ")}
        >
          {kindLabel}
        </span>
      </div>
      <LocalizedText>{item.text}</LocalizedText>
    </div>
  );
}

function LatentNeedChip({
  postit,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
  onRemove,
  onUpdate,
  canEdit = false,
  startInEditMode = false,
  large = false,
}: {
  postit: Stage5BoardPostit;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  onUpdate?: (text: string) => void;
  /** 클릭 시 편집 모드 허용 */
  canEdit?: boolean;
  /** 새로 추가된 카드처럼 처음부터 편집 모드 */
  startInEditMode?: boolean;
  large?: boolean;
}) {
  const [editing, setEditing] = useState(
    Boolean(canEdit && (startInEditMode || !postit.text.trim())),
  );
  const suppressClickRef = useRef(false);
  const textareaWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (startInEditMode && canEdit) setEditing(true);
  }, [canEdit, startInEditMode]);

  useEffect(() => {
    if (!editing) return;
    const root = textareaWrapRef.current;
    const field = root?.querySelector("textarea");
    field?.focus();
    // 커서를 끝으로
    if (field) {
      const len = field.value.length;
      field.setSelectionRange(len, len);
    }
  }, [editing]);

  const exitEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const enterEdit = useCallback(() => {
    if (!canEdit || !onUpdate) return;
    setEditing(true);
  }, [canEdit, onUpdate]);

  return (
    <div
      draggable={Boolean(draggable && !editing)}
      onDragStart={
        draggable && !editing
          ? (e) => {
              suppressClickRef.current = true;
              onDragStart?.(e);
            }
          : undefined
      }
      onDragEnd={draggable && !editing ? onDragEnd : undefined}
      onClick={() => {
        if (editing) return;
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        enterEdit();
      }}
      className={[
        "group relative min-w-0 overflow-hidden rounded-md border border-[#7E57C2]/40 bg-[#EDE7F6]/95 font-semibold text-[#1c1a16] break-keep [overflow-wrap:anywhere]",
        large
          ? "px-3 py-2.5 text-[15px] leading-relaxed"
          : editing
            ? "px-1.5 py-1.5 text-[12px] leading-snug"
            : "px-1 py-0.5 text-[10px] leading-snug",
        canEdit && !editing && !draggable ? "cursor-text" : "",
        draggable && !editing ? "cursor-grab active:cursor-grabbing" : "",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
      role={canEdit && !editing ? "button" : undefined}
      aria-label={canEdit && !editing ? "클릭하여 잠재 니즈 편집" : undefined}
    >
      <div className="mb-0.5 flex items-center justify-between gap-1 pr-4">
        <span
          className={[
            "font-bold opacity-70",
            large ? "text-[12px]" : "text-[9px]",
          ].join(" ")}
        >
          잠재 니즈
        </span>
        {draggable && !editing ? (
          <span
            className="rounded px-1 text-[10px] text-[#5E35B1]/70"
            title="끌어다 여정 단계에 배치"
            aria-hidden
          >
            ⠿
          </span>
        ) : null}
      </div>
      {editing && onUpdate ? (
        <div
          ref={textareaWrapRef}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              exitEdit();
            }
          }}
        >
          <LocalizedEditableTextarea
            value={postit.text}
            onValueChange={onUpdate}
            rows={3}
            placeholder="잠재 니즈를 적어 보세요"
            onBlur={exitEdit}
            className="w-full min-w-0 resize-y rounded border border-[#7E57C2]/25 bg-panel/80 px-1.5 py-1 text-[12px] font-semibold leading-snug text-[#1c1a16] outline-none placeholder:text-subtle focus:border-[#7E57C2]/55"
          />
        </div>
      ) : (
        <LocalizedText>
          {postit.text.trim() || "클릭하여 잠재 니즈 작성"}
        </LocalizedText>
      )}
      {onRemove ? (
        <button
          type="button"
          data-no-expand
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-0.5 right-0.5 rounded px-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/50"
          aria-label="잠재 니즈 삭제"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

function RowLabel({
  row,
  last,
}: {
  row: "step" | JourneyStepZone | "needs";
  last?: boolean;
}) {
  const labelKey = row === "needs" ? "needs" : row;
  const hintKey =
    row === "step"
      ? "stepHint"
      : row === "needs"
        ? "needsHint"
        : (`${row}Hint` as keyof typeof JOURNEY_BOARD_ROW_LABELS);

  return (
    <div
      className={[
        "user-journey-board__row-labels flex h-full min-w-0 self-stretch items-start pr-1",
        row === "step"
          ? "min-h-[4.5rem] border-b border-border-warm/60 pb-1.5 pt-1.5"
          : last
            ? "min-h-[6rem] py-2"
            : "min-h-[6rem] border-b border-border-warm/60 py-2",
      ].join(" ")}
      aria-hidden
    >
      <div className="min-w-0 text-left break-keep">
        <p className={`${stageLabel} user-journey-board__row-label`}>
          {JOURNEY_BOARD_ROW_LABELS[labelKey]}
        </p>
        <p className="mt-0.5 text-[10px] user-journey-board__row-label-hint">
          {JOURNEY_BOARD_ROW_LABELS[hintKey]}
        </p>
      </div>
    </div>
  );
}

interface LatentNeedsJourneyBoardProps {
  projectId: string;
  journey: UserJourneyMapData;
  onJourneySubjectChange: (journey: UserJourneyMapData) => void;
  needs: Stage5LatentNeedsData;
  onNeedsChange: (needs: Stage5LatentNeedsData) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function LatentNeedsJourneyBoard({
  projectId,
  journey,
  onJourneySubjectChange,
  needs,
  onNeedsChange,
  onGenerate,
  generating,
}: LatentNeedsJourneyBoardProps) {
  const subjectId = journey.activeSubjectId;
  const persona = getActivePersonaMap(journey);
  const activeSubject =
    journey.subjects.find((s) => s.id === subjectId) ?? journey.subjects[0];
  const activeIndex = journey.subjects.findIndex((s) => s.id === subjectId);

  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [editingKickoffId, setEditingKickoffId] = useState<string | null>(null);
  const { expandedPostitId, onExpandedChange } = useJourneyPostitExpansion();

  const stepRows = useMemo(() => {
    if (!persona) return [];
    return [...persona.steps]
      .sort((a, b) => a.order - b.order)
      .map((step, stepIndex) => {
        const zones = Object.fromEntries(
          (["behavior", "touchpoint", "pain_point", "feeling"] as const).map(
            (zone) => [zone, journeyItemsForZone(journey, step, zone)],
          ),
        ) as Record<JourneyStepZone, JourneyMapItem[]>;
        return { step, stepIndex, zones };
      });
  }, [journey, persona]);

  const emotionPoints = useMemo(() => {
    if (!persona) return [];
    return buildJourneyEmotionPoints(persona.steps, journey.itemsById);
  }, [journey.itemsById, persona]);

  const poolNeeds = useMemo(() => {
    if (!subjectId) return [];
    return poolLatentNeedPostits(needs, subjectId);
  }, [needs, subjectId]);

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

  const allowDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(targetId);
  };

  const handleDropOnStep = useCallback(
    (stepId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData(DRAG_MIME);
      if (!itemId) return;
      onNeedsChange(assignLatentNeedToStep(needs, itemId, stepId));
      handleDragEnd();
    },
    [handleDragEnd, needs, onNeedsChange],
  );

  const handleDropOnPool = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData(DRAG_MIME);
      if (!itemId) return;
      onNeedsChange(returnLatentNeedToPool(needs, itemId));
      handleDragEnd();
    },
    [handleDragEnd, needs, onNeedsChange],
  );

  const updateLatentText = useCallback(
    (postitId: string, text: string) => {
      onNeedsChange({
        ...needs,
        postits: needs.postits.map((p) =>
          p.id === postitId ? { ...p, text } : p,
        ),
      });
    },
    [needs, onNeedsChange],
  );

  const removeLatentPostit = useCallback(
    (postitId: string) => {
      const cleared = returnLatentNeedToPool(needs, postitId);
      onNeedsChange({
        ...cleared,
        postits: cleared.postits.filter((p) => p.id !== postitId),
      });
    },
    [needs, onNeedsChange],
  );

  const addManualLatentNeed = useCallback(() => {
    if (!subjectId || !activeSubject) return;
    const hasSubject = needs.subjects.some((s) => s.id === subjectId);
    const subjects = hasSubject
      ? needs.subjects
      : [
          ...needs.subjects,
          {
            id: activeSubject.id,
            name: activeSubject.name,
            context: activeSubject.context,
            thumbnailUrl: activeSubject.thumbnailUrl,
            researchMethodId: "" as const,
            conductedAt: "",
          },
        ];
    const created = createStage5BoardPostit(subjectId, "latent_need", {
      text: "",
      readonly: false,
      kevinGenerated: false,
    });
    setEditingKickoffId(created.id);
    onNeedsChange({
      ...needs,
      subjects,
      postits: [...needs.postits, created],
    });
  }, [activeSubject, needs, onNeedsChange, subjectId]);

  if (!persona || !activeSubject) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-border-warm bg-cream/50 px-5 py-6">
        <p className={stageCaption}>
          앞 단계의 사용자 여정 지도가 아직 없어요. 여정 단계를 채운 뒤 여기서
          잠재 니즈를 올려 보세요.
        </p>
        <Link
          href={`/project/${projectId}/stage/5`}
          className={`${stageBtnSecondary} inline-flex`}
        >
          사용자 여정 지도로 가기
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
      {journey.subjects.length > 0 ? (
        <div
          className="rounded-lg border border-border-warm/70 bg-cream/30 px-3 py-2.5"
          role="tablist"
          aria-label="페르소나 선택"
        >
          <p className={`mb-2.5 ${stageLabel}`}>페르소나</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {journey.subjects.map((subject, idx) => {
              const selected = subjectId === subject.id;
              return (
                <button
                  key={subject.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() =>
                    onJourneySubjectChange(
                      setActiveSubject(journey, subject.id),
                    )
                  }
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
            사용자 여정 지도 · 잠재 니즈
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-foreground break-keep">
            {personaLabel}의 여정에서 진짜 필요 찾기
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
                : "앞 단계 여정 지도의 페르소나 맥락이 여기 표시됩니다."}
            </p>
          </div>
          <div className="p-4">
            <p className={`mb-1.5 ${stageLabel}`}>기대 사항</p>
            <p className="rounded-lg border border-border-warm bg-cream/40 px-2.5 py-2 text-[13px] leading-relaxed text-foreground break-keep">
              {persona.expectations.trim() ||
                "여정 지도에서 적은 기대 사항이 여기 보여요."}
            </p>
          </div>
        </div>

        <div className="user-journey-board__scroll p-2 sm:p-3">
          <p className={`mb-2 px-0.5 ${stageCaption}`}>
            위 여정·감정은 앞 단계 내용을 유지합니다. 맨 아래 잠재 니즈 행에
            카드를 올려 단계별 진짜 필요를 정리하세요.
          </p>
          <div
            className="user-journey-board__canvas grid gap-x-1.5"
            style={{
              gridTemplateColumns: `${JOURNEY_LABEL_COL} repeat(${stepRows.length}, ${JOURNEY_STEP_COL})`,
              gridTemplateRows: `repeat(${JOURNEY_GRID_ROW_COUNT}, auto)`,
            }}
          >
            <RowLabel row="step" />
            {stepRows.map(({ step, stepIndex }) => (
              <div
                key={`${step.id}-header`}
                className={`${stepColumnCellClass("header", stepIndex)} flex min-h-[4.5rem] h-full items-center justify-center px-1.5 py-2`}
              >
                <p className="w-full px-1 text-center text-[13px] font-semibold leading-snug text-foreground break-keep">
                  {step.label.trim() || `단계 ${stepIndex + 1}`}
                </p>
              </div>
            ))}

            {READONLY_ZONES.map((zone) => (
              <Fragment key={zone}>
                <RowLabel row={zone} />
                {stepRows.map(({ step, stepIndex, zones }) => {
                  const items = zones[zone];
                  const aiEntries = isJourneyAiZone(zone)
                    ? resolveStepAiEntries(step, zone).filter((t) => t.trim())
                    : [];
                  const empty = items.length === 0 && aiEntries.length === 0;
                  return (
                    <div
                      key={`${step.id}-${zone}`}
                      className={[
                        "user-journey-board__zone flex h-full min-h-[6rem] min-w-0 flex-col gap-1.5 p-1.5",
                        `user-journey-board__zone--${zone}`,
                        stepColumnCellClass(zone, stepIndex),
                      ].join(" ")}
                    >
                      {items.length > 0 ? (
                        <div className="user-journey-board__zone-items">
                          {items.map((item, index) => {
                            const chip = (
                              <ReadonlyChip item={item} index={index} />
                            );
                            if (zone !== "behavior") {
                              return <div key={item.id}>{chip}</div>;
                            }
                            return (
                              <ExpandableJourneyPostit
                                key={item.id}
                                postitId={item.id}
                                expandedPostitId={expandedPostitId}
                                onExpandedChange={onExpandedChange}
                                expandedChildren={
                                  <ReadonlyChip
                                    item={item}
                                    index={index}
                                    large
                                  />
                                }
                              >
                                {chip}
                              </ExpandableJourneyPostit>
                            );
                          })}
                        </div>
                      ) : null}
                      {aiEntries.length > 0 ? (
                        <div className="user-journey-board__zone-items">
                          {aiEntries.map((entry, index) => (
                            <div
                              key={`${step.id}-${zone}-ai-${index}`}
                              className="min-w-0 rounded-md border border-border-warm/70 bg-panel px-1 py-0.5 text-[10px] font-semibold leading-snug text-foreground break-keep [overflow-wrap:anywhere]"
                            >
                              <LocalizedText>{entry}</LocalizedText>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {empty ? (
                        <p className="user-journey-board__zone-placeholder px-1 py-3 text-center break-keep">
                          —
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </Fragment>
            ))}

            <RowLabel row="feeling" />
            <div
              className="user-journey-board__zone user-journey-board__zone--feeling border-l border-r border-border-warm bg-panel min-w-0"
              style={{ gridColumn: `2 / ${stepRows.length + 2}` }}
            >
              <JourneyEmotionCurve points={emotionPoints} />
            </div>

            <RowLabel row="needs" last />
            {stepRows.map(({ step, stepIndex }) => {
              const zoneKey = `${step.id}-needs`;
              const isDropActive = dropTarget === zoneKey;
              const stepNeeds = stepLatentNeedPostits(needs, step.id);
              return (
                <div
                  key={zoneKey}
                  onDragOver={allowDrop(zoneKey)}
                  onDragLeave={() =>
                    setDropTarget((current) =>
                      current === zoneKey ? null : current,
                    )
                  }
                  onDrop={handleDropOnStep(step.id)}
                  className={[
                    "user-journey-board__zone user-journey-board__zone--needs flex h-full min-h-[6rem] min-w-0 flex-col gap-1.5 p-1.5 transition-colors",
                    stepColumnCellClass("needs", stepIndex),
                    isDropActive ? "bg-highlight/80" : "",
                  ].join(" ")}
                >
                  {stepNeeds.length > 0 ? (
                    <div className="user-journey-board__zone-items">
                      {stepNeeds.map((postit) => (
                        <ExpandableJourneyPostit
                          key={postit.id}
                          postitId={postit.id}
                          expandedPostitId={expandedPostitId}
                          onExpandedChange={onExpandedChange}
                          expandedChildren={
                            <LatentNeedChip postit={postit} large />
                          }
                        >
                          <LatentNeedChip
                            postit={postit}
                            draggable
                            isDragging={draggingItemId === postit.id}
                            onDragStart={handleDragStart(postit.id)}
                            onDragEnd={handleDragEnd}
                            onRemove={() =>
                              onNeedsChange(
                                returnLatentNeedToPool(needs, postit.id),
                              )
                            }
                          />
                        </ExpandableJourneyPostit>
                      ))}
                    </div>
                  ) : (
                    <p className="user-journey-board__zone-placeholder px-1 py-3 text-center break-keep">
                      {isDropActive
                        ? JOURNEY_BOARD_PLACEHOLDERS.needsDropActive
                        : JOURNEY_BOARD_PLACEHOLDERS.needsDrop}
                    </p>
                  )}
                </div>
              );
            })}
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
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className={stageLabel}>{personaLabel} · 배치 전 잠재 니즈</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={addManualLatentNeed}
              className="rounded-md border border-dashed border-border-warm bg-panel/80 px-2.5 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:border-spotlight/50 hover:bg-highlight/40"
            >
              + 잠재 니즈 추가
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className={stageBtnSecondary}
            >
              {generating ? "도출 중…" : "AI로 잠재 니즈 도출"}
            </button>
          </div>
        </div>
        <p className={`mb-3 ${stageCaption}`}>
          카드를 클릭하면 편집할 수 있어요. 작성 후 끌어다 여정 단계의 잠재 니즈
          행에 올려 주세요. 단계에서 빼려면 여기로 다시 놓으면 됩니다.
        </p>
        {poolNeeds.length === 0 ? (
          <p className={stageCaption}>
            아직 배치 전 카드가 없어요. 「+ 잠재 니즈 추가」로 직접 적거나 AI로
            도출해 보세요.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {poolNeeds.map((postit) => (
              <div key={postit.id} className="w-[min(100%,14rem)]">
                <LatentNeedChip
                  postit={postit}
                  canEdit
                  startInEditMode={editingKickoffId === postit.id}
                  draggable={Boolean(postit.text.trim())}
                  isDragging={draggingItemId === postit.id}
                  onDragStart={handleDragStart(postit.id)}
                  onDragEnd={handleDragEnd}
                  onUpdate={(text) => {
                    if (editingKickoffId === postit.id) {
                      setEditingKickoffId(null);
                    }
                    updateLatentText(postit.id, text);
                  }}
                  onRemove={() => removeLatentPostit(postit.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function withBootstrappedJourneyNeeds(
  needs: Stage5LatentNeedsData,
  journey: UserJourneyMapData,
): Stage5LatentNeedsData {
  return bootstrapLatentNeedsOntoJourney(needs, journey);
}
