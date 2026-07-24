"use client";

import { useCallback, useMemo, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  CORE_CANDIDATE_CELL,
  NEED_SIGNAL_LABELS,
  clearNeedRating,
  needGroupNameMap,
  needsInQuadrantCell,
  parkNeed,
  parkedLatentNeeds,
  placeNeedInQuadrant,
  setSelectionRationale,
  toggleCoreNeed,
  toggleNeedSignal,
  unparkNeed,
  unplacedLatentNeeds,
} from "@/lib/stages/stage5/latentNeedsCoreSelection";
import {
  requestCoreNeedsReview,
  type CoreNeedReview,
} from "@/lib/stages/stage5/reviewCoreNeedsClient";
import {
  CORE_NEED_LIMIT,
  CORE_NEED_SOFT_WARN_AT,
  NEED_SIGNAL_IDS,
  type NeedQuadrantCell,
  type Stage5BoardPostit,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { stageBtnSecondary, stageCaption, stageLabel } from "@/lib/stages/ui";

const DRAG_MIME = "application/x-spotlight-core-need-item";

type DropZone = NeedQuadrantCell | "tray" | "parked";

const QUADRANT_ROWS: Array<{
  importanceLabel: string;
  cells: Array<{ cell: NeedQuadrantCell; title: string; hint: string }>;
}> = [
  {
    importanceLabel: "중요도 높음",
    cells: [
      {
        cell: "high_importance_low_gap",
        title: "중요하지만 대안 있음",
        hint: "이미 그럭저럭 해결되는 중",
      },
      {
        cell: "high_importance_high_gap",
        title: "중요하고 해결도 안 됨",
        hint: "핵심 후보",
      },
    ],
  },
  {
    importanceLabel: "중요도 낮음",
    cells: [
      {
        cell: "low_importance_low_gap",
        title: "덜 중요하고 대안 있음",
        hint: "지금은 지나가도 괜찮음",
      },
      {
        cell: "low_importance_high_gap",
        title: "덜 중요하지만 비어 있음",
        hint: "나중에 다시 볼 만함",
      },
    ],
  },
];

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function TrayNeedCard({
  postit,
  groupName,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  postit: Stage5BoardPostit;
  groupName?: string;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "min-w-0 cursor-grab rounded-md border border-[#7E57C2]/40 bg-[#EDE7F6]/95 px-2.5 py-2 text-[13px] font-semibold leading-snug text-[#1c1a16] break-keep [overflow-wrap:anywhere] active:cursor-grabbing",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
    >
      <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold opacity-70">
        잠재 니즈
        {groupName ? (
          <span className="rounded-sm bg-white/70 px-1 py-px font-semibold opacity-90">
            <LocalizedText>{groupName}</LocalizedText>
          </span>
        ) : null}
      </p>
      <LocalizedText>{postit.text}</LocalizedText>
    </div>
  );
}

function QuadrantNeedCard({
  postit,
  groupName,
  data,
  isDragging,
  coreLimitReached,
  onChange,
  onCoreAddAttempt,
  onDragStart,
  onDragEnd,
}: {
  postit: Stage5BoardPostit;
  groupName?: string;
  data: Stage5LatentNeedsData;
  isDragging: boolean;
  coreLimitReached: boolean;
  onChange: (data: Stage5LatentNeedsData) => void;
  onCoreAddAttempt: (nextCount: number) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const isCore = data.coreNeedIds.includes(postit.id);
  const rating = data.needRatings[postit.id];
  const coreDisabled = !isCore && coreLimitReached;
  const rationale = data.selectionRationales?.[postit.id] ?? "";

  const handleToggleCore = () => {
    if (!isCore) {
      onCoreAddAttempt(data.coreNeedIds.length + 1);
    }
    onChange(toggleCoreNeed(data, postit.id));
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "min-w-0 cursor-grab rounded-md border bg-[#EDE7F6]/95 px-2.5 py-2 text-[13px] font-semibold leading-snug text-[#1c1a16] break-keep [overflow-wrap:anywhere] active:cursor-grabbing",
        isCore
          ? "border-spotlight ring-2 ring-spotlight/50"
          : "border-[#7E57C2]/40",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
    >
      <div className="mb-1 flex items-start justify-between gap-1.5">
        <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-bold opacity-70">
          잠재 니즈
          {groupName ? (
            <span className="rounded-sm bg-white/70 px-1 py-px font-semibold opacity-90">
              <LocalizedText>{groupName}</LocalizedText>
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={handleToggleCore}
          disabled={coreDisabled}
          title={
            coreDisabled
              ? `핵심 니즈는 최대 ${CORE_NEED_LIMIT}개까지예요`
              : isCore
                ? "핵심 지정 해제"
                : "핵심 니즈로 지정"
          }
          aria-pressed={isCore}
          className={[
            "shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-bold transition-colors",
            isCore
              ? "border-spotlight bg-spotlight text-on-spotlight"
              : "border-[#7E57C2]/40 bg-white/70 text-[#1c1a16] hover:border-spotlight/60",
            coreDisabled ? "cursor-not-allowed opacity-40" : "",
          ].join(" ")}
        >
          {isCore ? "★ 핵심" : "☆ 핵심으로"}
        </button>
      </div>

      <LocalizedText>{postit.text}</LocalizedText>

      {isCore ? (
        <label className="mt-1.5 block">
          <span className="mb-0.5 block text-[10px] font-semibold text-[#1c1a16]/55">
            왜 이걸 골랐나요? (선택)
          </span>
          <input
            type="text"
            value={rationale}
            onChange={(e) =>
              onChange(setSelectionRationale(data, postit.id, e.target.value))
            }
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="예: 조사에서 자주 나왔고, 대안이 약함"
            className="w-full rounded-sm border border-[#7E57C2]/25 bg-white/80 px-1.5 py-1 text-[11px] font-medium text-[#1c1a16] outline-none placeholder:text-[#1c1a16]/35 focus:border-spotlight/50"
          />
        </label>
      ) : null}

      <div className="mt-1.5 flex flex-wrap gap-1">
        {NEED_SIGNAL_IDS.map((signal) => {
          const active = rating?.signals.includes(signal) ?? false;
          return (
            <button
              key={signal}
              type="button"
              onClick={() => onChange(toggleNeedSignal(data, postit.id, signal))}
              aria-pressed={active}
              className={[
                "rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                active
                  ? "border-[#7E57C2]/70 bg-[#7E57C2]/15 text-[#4A3580]"
                  : "border-[#7E57C2]/25 bg-white/60 text-[#1c1a16]/60 hover:border-[#7E57C2]/50",
              ].join(" ")}
            >
              {NEED_SIGNAL_LABELS[signal]}
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={() => onChange(parkNeed(data, postit.id))}
          className="rounded-sm px-1.5 py-0.5 text-[11px] font-semibold text-[#1c1a16]/55 transition-colors hover:bg-white/70 hover:text-[#1c1a16]"
        >
          보류함으로
        </button>
      </div>
    </div>
  );
}

interface LatentNeedsCoreSelectionBoardProps {
  projectId: string;
  data: Stage5LatentNeedsData;
  onChange: (data: Stage5LatentNeedsData) => void;
}

export function LatentNeedsCoreSelectionBoard({
  projectId,
  data,
  onChange,
}: LatentNeedsCoreSelectionBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropZone | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviews, setReviews] = useState<CoreNeedReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [softWarnVisible, setSoftWarnVisible] = useState(false);

  const groupNames = useMemo(() => needGroupNameMap(data), [data]);
  const unplaced = useMemo(() => unplacedLatentNeeds(data), [data]);
  const parked = useMemo(() => parkedLatentNeeds(data), [data]);
  const needById = useMemo(
    () => new Map(data.postits.map((p) => [p.id, p] as const)),
    [data.postits],
  );
  const coreLimitReached = data.coreNeedIds.length >= CORE_NEED_LIMIT;
  const showSoftWarn =
    softWarnVisible || data.coreNeedIds.length >= CORE_NEED_SOFT_WARN_AT;

  const handleCoreAddAttempt = useCallback((nextCount: number) => {
    if (nextCount >= CORE_NEED_SOFT_WARN_AT) {
      setSoftWarnVisible(true);
    }
  }, []);

  const handleDragStart = useCallback((needId: string) => {
    return (e: React.DragEvent) => {
      e.dataTransfer.setData(DRAG_MIME, needId);
      e.dataTransfer.effectAllowed = "move";
      setDraggingId(needId);
    };
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTarget(null);
  }, []);

  const allowDrop = (zone: DropZone) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(zone);
  };

  const leaveDrop = (zone: DropZone) => () =>
    setDropTarget((current) => (current === zone ? null : current));

  const handleDrop = useCallback(
    (zone: DropZone) => (e: React.DragEvent) => {
      e.preventDefault();
      const needId = e.dataTransfer.getData(DRAG_MIME);
      if (needId) {
        if (zone === "tray") {
          onChange(unparkNeed(clearNeedRating(data, needId), needId));
        } else if (zone === "parked") {
          onChange(parkNeed(data, needId));
        } else {
          onChange(placeNeedInQuadrant(data, needId, zone));
        }
      }
      setDraggingId(null);
      setDropTarget(null);
    },
    [data, onChange],
  );

  const handleKevinReview = useCallback(async () => {
    const core = data.coreNeedIds
      .map((id) => needById.get(id))
      .filter((p): p is Stage5BoardPostit => Boolean(p?.text.trim()))
      .map((p) => ({ id: p.id, text: p.text.trim() }));
    if (core.length === 0) {
      setError("먼저 핵심 니즈를 1개 이상 지정해 주세요.");
      return;
    }
    const parkedPayload = parked.map((p) => ({
      id: p.id,
      text: p.text.trim(),
    }));

    setReviewing(true);
    setError(null);
    try {
      const result = await requestCoreNeedsReview(
        projectId,
        core,
        parkedPayload,
      );
      setReviews(result.reviews);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kevin 관점 요청에 실패했습니다.",
      );
    } finally {
      setReviewing(false);
    }
  }, [data.coreNeedIds, needById, parked, projectId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={stageCaption}>
          카드를 사분면에 끌어다 놓고, 좋은 아이디어로 이어질 핵심 니즈를 최대{" "}
          {CORE_NEED_LIMIT}개까지 골라 보세요. 나머지는 보류함에 — 버리는 게
          아니라 잠시 접어두는 거예요.
        </p>
        <button
          type="button"
          onClick={() => void handleKevinReview()}
          disabled={reviewing || data.coreNeedIds.length === 0}
          className={stageBtnSecondary}
        >
          {reviewing ? "Kevin이 살펴보는 중…" : "Kevin 관점 듣기"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-spotlight/15 px-2.5 py-1 text-[13px] font-semibold text-foreground">
          핵심 니즈 {data.coreNeedIds.length} / {CORE_NEED_LIMIT}
        </span>
        <span className="rounded-md bg-cream px-2.5 py-1 text-[13px] font-semibold text-muted">
          보류 {parked.length}개
        </span>
        {unplaced.length > 0 ? (
          <span className="text-[12px] text-muted break-keep">
            아직 배치 안 한 니즈 {unplaced.length}개
          </span>
        ) : null}
      </div>

      {showSoftWarn ? (
        <div className="rounded-xl border border-spotlight/40 bg-[#FFFDF4] px-3 py-2.5">
          <p className="text-[13px] font-semibold text-foreground break-keep">
            Kevin: 지금 {data.coreNeedIds.length || CORE_NEED_SOFT_WARN_AT}개를
            골랐어요. 2~3개로 좁히면 다음 단계에서 더 깊이 파고들 수 있어요.
            그래도 계속 {data.coreNeedIds.length || CORE_NEED_SOFT_WARN_AT}개로
            가시겠어요?
          </p>
          <p className={`mt-1 ${stageCaption}`}>
            막지는 않아요. 원하면 최대 {CORE_NEED_LIMIT}개까지 유지해도 됩니다.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-[13px] font-medium text-[#C62828] break-keep">
          {error}
        </p>
      ) : null}

      {unplaced.length > 0 || dropTarget === "tray" ? (
        <section
          onDragOver={allowDrop("tray")}
          onDragLeave={leaveDrop("tray")}
          onDrop={handleDrop("tray")}
          className={[
            "rounded-xl border border-dashed p-3 transition-colors",
            dropTarget === "tray"
              ? "border-spotlight/70 bg-highlight/40"
              : "border-border-warm bg-cream/40",
          ].join(" ")}
        >
          <p className={`mb-2 ${stageLabel}`}>배치 대기</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unplaced.map((postit) => (
              <TrayNeedCard
                key={postit.id}
                postit={postit}
                groupName={groupNames.get(postit.id)}
                isDragging={draggingId === postit.id}
                onDragStart={handleDragStart(postit.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
            {unplaced.length === 0 ? (
              <p className="col-span-full py-2 text-center text-[12px] text-muted">
                여기에 놓으면 배치 대기로 돌아와요
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2 pl-7">
          <p className="text-[12px] font-semibold text-muted break-keep">
            ← 대안이 이미 있음
          </p>
          <p className="text-[12px] font-semibold text-muted break-keep">
            해결 공백이 큼 →
          </p>
        </div>
        {QUADRANT_ROWS.map((row) => (
          <div key={row.importanceLabel} className="flex gap-2">
            <div className="flex w-5 shrink-0 items-center justify-center">
              <p
                className="text-[11px] font-semibold tracking-wide text-muted"
                style={{ writingMode: "vertical-rl" }}
              >
                {row.importanceLabel}
              </p>
            </div>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              {row.cells.map(({ cell, title, hint }) => {
                const members = needsInQuadrantCell(data, cell);
                const isDropActive = dropTarget === cell;
                const isCandidate = cell === CORE_CANDIDATE_CELL;
                return (
                  <section
                    key={cell}
                    onDragOver={allowDrop(cell)}
                    onDragLeave={leaveDrop(cell)}
                    onDrop={handleDrop(cell)}
                    className={[
                      "flex min-h-[11rem] flex-col rounded-xl border p-3 transition-colors",
                      isDropActive
                        ? "border-spotlight/70 bg-highlight/40"
                        : isCandidate
                          ? "border-spotlight/40 bg-[#FFFDF4]"
                          : "border-border-warm bg-panel",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-foreground break-keep">
                        {title}
                      </p>
                      <span
                        className={[
                          "rounded-sm px-1.5 py-px text-[10px] font-semibold",
                          isCandidate
                            ? "bg-spotlight/20 text-foreground"
                            : "bg-cream text-muted",
                        ].join(" ")}
                      >
                        {hint}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      {members.length === 0 ? (
                        <p className="flex-1 rounded-md border border-dashed border-border-warm/80 px-2 py-5 text-center text-[12px] text-muted break-keep">
                          {isDropActive ? "여기에 놓기" : "카드를 끌어다 놓기"}
                        </p>
                      ) : (
                        members.map((postit) => (
                          <QuadrantNeedCard
                            key={postit.id}
                            postit={postit}
                            groupName={groupNames.get(postit.id)}
                            data={data}
                            isDragging={draggingId === postit.id}
                            coreLimitReached={coreLimitReached}
                            onChange={onChange}
                            onCoreAddAttempt={handleCoreAddAttempt}
                            onDragStart={handleDragStart(postit.id)}
                            onDragEnd={handleDragEnd}
                          />
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <section
        onDragOver={allowDrop("parked")}
        onDragLeave={leaveDrop("parked")}
        onDrop={handleDrop("parked")}
        className={[
          "rounded-xl border border-dashed p-3 transition-colors",
          dropTarget === "parked"
            ? "border-spotlight/70 bg-highlight/40"
            : "border-border-warm bg-surface",
        ].join(" ")}
      >
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <p className={stageLabel}>보류함</p>
          <p className="text-[12px] text-muted break-keep">
            지금은 접어두지만, 언제든 다시 꺼낼 수 있어요.
          </p>
        </div>
        {parked.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-warm/80 px-2 py-4 text-center text-[12px] text-muted break-keep">
            {dropTarget === "parked"
              ? "여기에 놓기"
              : "핵심이 아니라고 판단한 카드를 여기로 끌어다 놓으세요"}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {parked.map((postit) => (
              <div
                key={postit.id}
                className="min-w-0 rounded-md border border-border-warm bg-panel/80 px-2.5 py-2 text-[13px] font-medium leading-snug text-muted break-keep [overflow-wrap:anywhere]"
              >
                <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold opacity-70">
                  잠재 니즈
                  {groupNames.get(postit.id) ? (
                    <span className="rounded-sm bg-cream px-1 py-px font-semibold">
                      <LocalizedText>{groupNames.get(postit.id)!}</LocalizedText>
                    </span>
                  ) : null}
                </p>
                <LocalizedText>{postit.text}</LocalizedText>
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onChange(unparkNeed(data, postit.id))}
                    className={`${stageBtnSecondary} px-2 py-1 text-[11px]`}
                  >
                    다시 꺼내기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {reviews && reviews.length > 0 ? (
        <section className="rounded-xl border border-border-warm bg-surface p-3">
          <p className={`mb-2 ${stageLabel}`}>Kevin의 반대 관점</p>
          <p className={`mb-2.5 ${stageCaption}`}>
            혼자 고를 때는 반대 의견이 없기 쉬워요. 아래 질문에 답이 선다면
            그대로, 흔들린다면 보류함과 한 번 더 바꿔 보세요.
          </p>
          <div className="space-y-2">
            {reviews.map((review) => {
              const need = needById.get(review.needId);
              const mustBe =
                review.mustBeSuspicion === true ||
                review.kanoSignal === "must_be";
              return (
                <div
                  key={review.needId}
                  className={[
                    "rounded-md border bg-panel px-3 py-2.5",
                    mustBe
                      ? "border-spotlight/50 bg-[#FFFDF4]"
                      : "border-border-warm",
                  ].join(" ")}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {need ? (
                      <p className="text-[12px] font-semibold text-muted break-keep">
                        <LocalizedText>{clip(need.text, 60)}</LocalizedText>
                      </p>
                    ) : null}
                    {mustBe ? (
                      <span className="rounded-sm bg-spotlight/20 px-1.5 py-px text-[10px] font-semibold text-foreground">
                        당연할 수도? · 질문으로만
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[13px] font-semibold text-foreground leading-relaxed break-keep">
                    <LocalizedText>{review.counterQuestion}</LocalizedText>
                  </p>
                  {review.riskNote ? (
                    <p className="mt-1 text-[12px] text-muted leading-relaxed break-keep">
                      <LocalizedText>{review.riskNote}</LocalizedText>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
