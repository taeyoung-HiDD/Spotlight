"use client";

import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import {
  journeyStepHeaderClass,
  addJourneyStep,
  assignItemToStep,
  countJourneyStepItems,
  getActivePersonaMap,
  journeyItemById,
  poolItems,
  removeJourneyStep,
  returnItemToPool,
  setActiveSubject,
  updatePersonaExpectations,
  updateStepLabel,
  type JourneyMapItem,
  type JourneyMapItemKind,
  type UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
import { stageCaption, stageField, stageLabel } from "@/lib/stages/ui";

const DRAG_MIME = "application/x-spotlight-journey-item";

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

interface UserJourneyBoardProps {
  data: UserJourneyMapData;
  onChange: (data: UserJourneyMapData) => void;
}

function readDragItemId(e: React.DragEvent): string | null {
  const id = e.dataTransfer.getData(DRAG_MIME);
  return id || null;
}

const STEP_COUNT_CHIP = {
  quote: {
    label: "언급",
    className:
      "user-journey-board__step-count--quote border-[#F9A825]/45 bg-[#FFF9C4]/55",
  },
  observation: {
    label: "관찰",
    className:
      "user-journey-board__step-count--observation border-[#FB8C00]/40 bg-[#FFE0B2]/55",
  },
  need: {
    label: "니즈",
    className:
      "user-journey-board__step-count--need border-[#7E57C2]/40 bg-[#EDE7F6]/70",
  },
} as const;

function JourneyStepInsightCounts({
  items,
}: {
  items: JourneyMapItem[];
}) {
  const counts = countJourneyStepItems(items);

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {(Object.keys(STEP_COUNT_CHIP) as Array<keyof typeof STEP_COUNT_CHIP>).map(
        (key) => {
          const meta = STEP_COUNT_CHIP[key];
          const value =
            key === "quote"
              ? counts.quotes
              : key === "observation"
                ? counts.observations
                : counts.needs;
          return (
            <span
              key={key}
              className={[
                "user-journey-board__step-count inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                meta.className,
              ].join(" ")}
            >
              <span>{meta.label}</span>
              <span className="tabular-nums">{value}</span>
            </span>
          );
        },
      )}
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
}: {
  item: JourneyMapItem;
  index?: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  isDragging?: boolean;
}) {
  const meta = KIND_CHIP[item.kind];
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "group relative rounded-md border px-2 py-1.5 text-[12px] font-semibold leading-snug break-keep",
        meta.className,
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
    >
      <div className="mb-0.5 flex items-center gap-1.5">
        {typeof index === "number" ? (
          <span className="text-[10px] font-bold opacity-60">{index + 1}.</span>
        ) : null}
        <span className="text-[10px] font-bold opacity-70">{meta.label}</span>
      </div>
      {item.text}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 rounded px-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/50"
          aria-label="단계에서 제거"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export function UserJourneyBoard({ data, onChange }: UserJourneyBoardProps) {
  const subjectId = data.activeSubjectId;
  const persona = getActivePersonaMap(data);
  const activeSubject =
    data.subjects.find((s) => s.id === subjectId) ?? data.subjects[0];
  const activeIndex = data.subjects.findIndex((s) => s.id === subjectId);

  const unassigned = subjectId ? poolItems(data, subjectId) : [];
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

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
    (stepId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      if (!subjectId) return;
      const itemId = readDragItemId(e);
      if (!itemId) return;
      onChange(assignItemToStep(data, subjectId, itemId, stepId));
      handleDragEnd();
    },
    [data, onChange, handleDragEnd, subjectId],
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
      <p className={stageCaption}>
        4·5단계에서 조사 대상을 먼저 정리하면, 페르소나별 여정 지도를 그릴 수
        있어요.
      </p>
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

      <div className="overflow-hidden rounded-xl border border-border-warm bg-panel">
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
            <textarea
              value={persona.expectations}
              onChange={(e) =>
                onChange(
                  updatePersonaExpectations(
                    data,
                    subjectId,
                    e.target.value,
                  ),
                )
              }
              rows={3}
              placeholder="이 페르소나가 여정에서 기대하거나 원하는 것을 적어 보세요."
              className={`w-full resize-y rounded-lg border border-border-warm px-2.5 py-2 text-[13px] leading-relaxed outline-none placeholder:text-subtle focus:border-spotlight/60 ${stageField}`}
            />
          </div>
        </div>

        <div className="overflow-x-auto p-3">
          <div className="flex min-w-max items-stretch gap-2">
            {persona.steps.map((step, stepIndex) => {
              const stepItems = step.itemIds
                .map((id) => journeyItemById(data, id))
                .filter((item): item is JourneyMapItem =>
                  Boolean(item?.text.trim()),
                );
              const isDropActive = dropTarget === step.id;
              return (
                <div
                  key={step.id}
                  className="flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-lg border border-border-warm bg-panel"
                >
                  <div
                    className={`${journeyStepHeaderClass(stepIndex)} border-b px-2 py-2`}
                  >
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={step.label}
                        onChange={(e) =>
                          onChange(
                            updateStepLabel(
                              data,
                              subjectId,
                              step.id,
                              e.target.value,
                            ),
                          )
                        }
                        className="user-journey-board__step-input h-8 min-w-0 flex-1 rounded-md border border-border-warm/80 px-2 text-[13px] font-semibold leading-none outline-none focus:border-spotlight/50"
                        aria-label="여정 단계 이름"
                      />
                      {persona.steps.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onChange(
                              removeJourneyStep(data, subjectId, step.id),
                            )
                          }
                          className="user-journey-board__step-remove flex size-8 shrink-0 items-center justify-center rounded-md border border-border-warm/80 transition-colors"
                          aria-label={`${step.label} 단계 삭제`}
                        >
                          <IconTrash className="size-3.5" stroke={2} />
                        </button>
                      ) : null}
                    </div>
                    <JourneyStepInsightCounts items={stepItems} />
                  </div>

                  <div
                    onDragOver={allowDrop(step.id)}
                    onDragLeave={() =>
                      setDropTarget((current) =>
                        current === step.id ? null : current,
                      )
                    }
                    onDrop={handleDropOnStep(step.id)}
                    className={[
                      "min-h-[9rem] flex-1 space-y-1.5 p-2 transition-colors",
                      isDropActive
                        ? "bg-highlight/80"
                        : "bg-cream/20",
                    ].join(" ")}
                  >
                    {stepItems.length === 0 ? (
                      <p className={`px-1 py-6 text-center ${stageCaption}`}>
                        {isDropActive
                          ? "여기에 놓기"
                          : "아래에서 끌어다 놓기"}
                      </p>
                    ) : (
                      stepItems.map((item, itemIndex) => (
                        <JourneyItemChip
                          key={item.id}
                          item={item}
                          index={itemIndex}
                          draggable
                          isDragging={draggingItemId === item.id}
                          onDragStart={handleDragStart(item.id)}
                          onDragEnd={handleDragEnd}
                          onRemove={() =>
                            onChange(
                              returnItemToPool(data, subjectId, item.id),
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => onChange(addJourneyStep(data, subjectId))}
              className={[
                "flex w-[11.5rem] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-warm bg-cream/20 px-3 py-6 text-muted transition-colors",
                "hover:border-spotlight/50 hover:bg-highlight/50 hover:text-foreground",
              ].join(" ")}
              aria-label="여정 단계 추가"
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-border-warm bg-panel">
                <IconPlus className="size-5" stroke={2} />
              </span>
              <span className="text-[13px] font-semibold">단계 추가</span>
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
      >
        <p className={`mb-2 ${stageLabel}`}>
          {personaLabel} · 배치 전 조사·니즈
        </p>
        <p className={`mb-2 ${stageCaption}`}>
          이 페르소나의 언급·관찰·잠재 니즈만 아래에 모여요. 카드를 위 여정
          단계로 드래그하세요.
        </p>
        {unassigned.length === 0 ? (
          <p className={stageCaption}>
            {draggingItemId
              ? "여기에 놓으면 배치 전 풀로 돌아가요"
              : "이 페르소나의 항목이 모두 배치됐거나, 아직 조사·니즈 데이터가 없어요."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unassigned.map((item) => (
              <JourneyItemChip
                key={item.id}
                item={item}
                draggable
                isDragging={draggingItemId === item.id}
                onDragStart={handleDragStart(item.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
