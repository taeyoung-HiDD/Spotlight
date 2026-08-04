"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { fetchStage1CollectState } from "@/lib/artifacts/stage1Collect";
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
import { listLatentNeedPostits } from "@/lib/stages/stage5/latentNeedsGroups";
import {
  applyCoreNeedSelection,
  collectJourneyPainPoints,
} from "@/lib/stages/stage5/selectCoreNeeds";
import { requestCoreNeedsSelection } from "@/lib/stages/stage5/selectCoreNeedsClient";
import {
  CORE_NEED_AUTO_TARGET,
  CORE_NEED_LIMIT,
  CORE_NEED_SOFT_WARN_AT,
  NEED_SIGNAL_IDS,
  type NeedQuadrantCell,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";
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

function TrayNeedCard({
  postit,
  groupName,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  postit: Stage5LatentNeedsData["postits"][number];
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
        "min-w-0 cursor-grab rounded-md border border-[#7E57C2]/40 bg-[#EDE7F6]/95 px-2 py-1.5 text-[12px] font-semibold leading-snug text-[#1c1a16] break-keep [overflow-wrap:anywhere] active:cursor-grabbing",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
    >
      {groupName ? (
        <p className="mb-0.5 truncate text-[10px] font-bold opacity-70">
          <LocalizedText>{groupName}</LocalizedText>
        </p>
      ) : null}
      <p className="line-clamp-2">
        <LocalizedText>{postit.text}</LocalizedText>
      </p>
    </div>
  );
}

function QuadrantNeedCard({
  postit,
  groupName,
  data,
  isDragging,
  coreLimitReached,
  onOpenDetail,
  onChange,
  onCoreAddAttempt,
  onDragStart,
  onDragEnd,
}: {
  postit: Stage5LatentNeedsData["postits"][number];
  groupName?: string;
  data: Stage5LatentNeedsData;
  isDragging: boolean;
  coreLimitReached: boolean;
  onOpenDetail: () => void;
  onChange: (data: Stage5LatentNeedsData) => void;
  onCoreAddAttempt: (nextCount: number) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const isCore = data.coreNeedIds.includes(postit.id);
  const rating = data.needRatings[postit.id];
  const coreDisabled = !isCore && coreLimitReached;
  const activeSignals = NEED_SIGNAL_IDS.filter((s) =>
    rating?.signals.includes(s),
  );

  const handleToggleCore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isCore) {
      onCoreAddAttempt(data.coreNeedIds.length + 1);
      onOpenDetail();
    }
    onChange(toggleCoreNeed(data, postit.id));
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      title="자세히 보기"
      className={[
        "min-w-0 cursor-grab rounded-md border bg-[#EDE7F6]/95 px-2 py-1.5 text-left text-[#1c1a16] break-keep [overflow-wrap:anywhere] active:cursor-grabbing",
        isCore
          ? "border-spotlight ring-1 ring-spotlight/50"
          : "border-[#7E57C2]/40",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex min-w-0 flex-wrap items-center gap-1">
            {groupName ? (
              <span className="rounded-sm bg-white/70 px-1 py-px text-[10px] font-semibold opacity-90">
                <LocalizedText>{groupName}</LocalizedText>
              </span>
            ) : (
              <span className="text-[10px] font-bold opacity-60">잠재 니즈</span>
            )}
            {activeSignals.length > 0 ? (
              <span className="text-[10px] font-semibold text-[#4A3580]/80">
                · {activeSignals.map((s) => NEED_SIGNAL_LABELS[s]).join(" · ")}
              </span>
            ) : null}
          </div>
          <p className="line-clamp-2 text-[12px] font-semibold leading-snug">
            <LocalizedText>{postit.text}</LocalizedText>
          </p>
        </div>
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
          {isCore ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}

function NeedDetailPopup({
  postit,
  groupName,
  data,
  coreLimitReached,
  onChange,
  onCoreAddAttempt,
  onClose,
}: {
  postit: Stage5LatentNeedsData["postits"][number];
  groupName?: string;
  data: Stage5LatentNeedsData;
  coreLimitReached: boolean;
  onChange: (data: Stage5LatentNeedsData) => void;
  onCoreAddAttempt: (nextCount: number) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const isCore = data.coreNeedIds.includes(postit.id);
  const rating = data.needRatings[postit.id];
  const coreDisabled = !isCore && coreLimitReached;
  const rationale = data.selectionRationales?.[postit.id] ?? "";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const handleToggleCore = () => {
    if (!isCore) onCoreAddAttempt(data.coreNeedIds.length + 1);
    onChange(toggleCoreNeed(data, postit.id));
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-charcoal/40" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          "relative w-full max-w-[32rem] rounded-xl border bg-panel p-5 shadow-[0_12px_40px_rgba(45,45,42,0.18)]",
          isCore ? "border-spotlight" : "border-border-warm",
        ].join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id={titleId} className={`mb-1 ${stageLabel}`}>
              잠재 니즈
              {groupName ? (
                <>
                  {" · "}
                  <LocalizedText>{groupName}</LocalizedText>
                </>
              ) : null}
            </p>
            <p className="text-[16px] font-semibold leading-relaxed text-foreground break-keep [overflow-wrap:anywhere]">
              <LocalizedText>{postit.text}</LocalizedText>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${stageBtnSecondary} shrink-0 px-2.5 py-1 text-[12px]`}
            aria-label="닫기"
          >
            닫기
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCore}
            disabled={coreDisabled}
            aria-pressed={isCore}
            className={[
              "rounded-md border px-2.5 py-1.5 text-[13px] font-bold transition-colors",
              isCore
                ? "border-spotlight bg-spotlight text-on-spotlight"
                : "border-[#7E57C2]/40 bg-[#EDE7F6]/95 text-[#1c1a16] hover:border-spotlight/60",
              coreDisabled ? "cursor-not-allowed opacity-40" : "",
            ].join(" ")}
          >
            {isCore ? "★ 핵심" : "☆ 핵심으로"}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(parkNeed(data, postit.id));
              onClose();
            }}
            className={`${stageBtnSecondary} px-2.5 py-1.5 text-[13px]`}
          >
            보류함으로
          </button>
        </div>

        {isCore ? (
          <label className="mb-4 block">
            <span className="mb-1 block text-[12px] font-semibold text-muted">
              왜 이걸 골랐나요? (선택)
            </span>
            <input
              type="text"
              value={rationale}
              onChange={(e) =>
                onChange(setSelectionRationale(data, postit.id, e.target.value))
              }
              placeholder="예: 조사에서 자주 나왔고, 대안이 약함"
              className="w-full rounded-md border border-border-warm bg-cream/60 px-3 py-2 text-[14px] font-medium text-foreground outline-none placeholder:text-muted focus:border-spotlight/50"
            />
          </label>
        ) : null}

        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-muted">근거 배지</p>
          <div className="flex flex-wrap gap-1.5">
            {NEED_SIGNAL_IDS.map((signal) => {
              const active = rating?.signals.includes(signal) ?? false;
              return (
                <button
                  key={signal}
                  type="button"
                  onClick={() =>
                    onChange(toggleNeedSignal(data, postit.id, signal))
                  }
                  aria-pressed={active}
                  className={[
                    "rounded-md border px-2 py-1 text-[12px] font-semibold transition-colors",
                    active
                      ? "border-[#7E57C2]/70 bg-[#7E57C2]/15 text-[#4A3580]"
                      : "border-border-warm bg-cream text-muted hover:border-[#7E57C2]/50",
                  ].join(" ")}
                >
                  {NEED_SIGNAL_LABELS[signal]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface LatentNeedsCoreSelectionBoardProps {
  projectId: string;
  journey: UserJourneyMapData;
  data: Stage5LatentNeedsData;
  onChange: (data: Stage5LatentNeedsData) => void;
}

export function LatentNeedsCoreSelectionBoard({
  projectId,
  journey,
  data,
  onChange,
}: LatentNeedsCoreSelectionBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropZone | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [softWarnVisible, setSoftWarnVisible] = useState(false);
  const [detailNeedId, setDetailNeedId] = useState<string | null>(null);
  const autoSelectRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const groupNames = useMemo(() => needGroupNameMap(data), [data]);
  const unplaced = useMemo(() => unplacedLatentNeeds(data), [data]);
  const parked = useMemo(() => parkedLatentNeeds(data), [data]);
  const coreLimitReached = data.coreNeedIds.length >= CORE_NEED_LIMIT;
  const showSoftWarn =
    softWarnVisible || data.coreNeedIds.length >= CORE_NEED_SOFT_WARN_AT;
  const detailPostit = useMemo(() => {
    if (!detailNeedId) return null;
    return (
      data.postits.find(
        (p) => p.id === detailNeedId && p.kind === "latent_need",
      ) ?? null
    );
  }, [data.postits, detailNeedId]);
  const closeDetail = useCallback(() => setDetailNeedId(null), []);

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

  const runAutoSelection = useCallback(async () => {
    const current = dataRef.current;
    const latents = listLatentNeedPostits(current);
    if (latents.length === 0) {
      setError("선별할 잠재 니즈가 없어요. 먼저 니즈 분석·분류를 채워 주세요.");
      return;
    }

    setSelecting(true);
    setError(null);
    try {
      const sourceById = new Map(
        current.postits
          .filter((p) => p.kind !== "latent_need" && p.text.trim())
          .map((p) => [p.id, p.text.trim()] as const),
      );
      const groupNamesMap = needGroupNameMap(current);
      const needs = latents.map((p) => ({
        id: p.id,
        text: p.text.trim(),
        subjectId: p.subjectId,
        groupName: groupNamesMap.get(p.id),
        linkedSourceTexts: (p.linkedSourceIds ?? [])
          .map((id) => sourceById.get(id))
          .filter((t): t is string => Boolean(t))
          .slice(0, 4),
      }));

      const [stage1] = await Promise.all([fetchStage1CollectState(projectId)]);
      const problem = stage1.state.startingPoint?.trim() ?? "";
      const painPoints = collectJourneyPainPoints(journey);

      const result = await requestCoreNeedsSelection({
        projectId,
        problem,
        painPoints,
        needs,
      });

      // 사용자가 선별 중 수동 편집했을 수 있으므로 최신 보드에 반영
      onChange(applyCoreNeedSelection(dataRef.current, result));
      if (result.selections.length >= CORE_NEED_SOFT_WARN_AT) {
        setSoftWarnVisible(true);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "핵심 니즈 자동 선별에 실패했습니다.",
      );
    } finally {
      setSelecting(false);
    }
  }, [journey, onChange, projectId]);

  // 탭 진입 시: 핵심이 없거나, 대부분 보류만 되어 있으면 1회 자동 선별
  useEffect(() => {
    if (autoSelectRef.current || selecting) return;
    const latents = listLatentNeedPostits(data);
    if (latents.length === 0) return;

    const parked = new Set(data.parkedNeedIds);
    const onQuadrant = latents.filter(
      (p) => data.needRatings[p.id] && !parked.has(p.id),
    ).length;
    const mostlyParked =
      latents.length >= 4 && onQuadrant < Math.ceil(latents.length * 0.5);

    if (data.coreNeedIds.length > 0 && !mostlyParked) {
      autoSelectRef.current = true;
      return;
    }

    autoSelectRef.current = true;
    void runAutoSelection();
  }, [data, runAutoSelection, selecting]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={stageCaption}>
          {selecting
            ? "문제·Pain·반복 패턴·HMW 전환 용이성을 기준으로 핵심 니즈를 고르는 중이에요…"
            : "카드를 눌러 크게 보고, 핵심·근거·보류를 조정해 보세요. 각 칸 안에서만 스크롤해 한눈에 비교할 수 있어요."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-spotlight/15 px-2.5 py-1 text-[13px] font-semibold text-foreground">
          핵심 니즈 {data.coreNeedIds.length} / {CORE_NEED_LIMIT}
        </span>
        <span className="rounded-md bg-cream px-2.5 py-1 text-[13px] font-semibold text-muted">
          보류 {parked.length}개
        </span>
        {selecting ? (
          <span className="text-[12px] font-semibold text-muted break-keep">
            자동 선별 중…
          </span>
        ) : null}
        {unplaced.length > 0 ? (
          <span className="text-[12px] text-muted break-keep">
            아직 배치 안 한 니즈 {unplaced.length}개
          </span>
        ) : null}
      </div>

      {showSoftWarn ? (
        <div className="rounded-xl border border-spotlight/40 bg-[#FFFDF4] px-3 py-2.5">
          <p className="text-[13px] font-semibold text-foreground break-keep">
            지금 {data.coreNeedIds.length || CORE_NEED_SOFT_WARN_AT}개를
            골랐어요. 기본은 {CORE_NEED_AUTO_TARGET}개예요. 너무 많으면 다음
            단계에서 깊이가 얕아질 수 있어요. 그래도 계속{" "}
            {data.coreNeedIds.length || CORE_NEED_SOFT_WARN_AT}개로
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
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 sm:items-stretch">
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
                      "flex h-[min(22rem,42vh)] min-h-[14rem] flex-col rounded-xl border p-2.5 transition-colors",
                      isDropActive
                        ? "border-spotlight/70 bg-highlight/40"
                        : isCandidate
                          ? "border-spotlight/40 bg-[#FFFDF4]"
                          : "border-border-warm bg-panel",
                    ].join(" ")}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
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
                      <span className="ml-auto rounded-sm bg-cream/80 px-1.5 py-px text-[10px] font-semibold text-muted">
                        {members.length}개
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5">
                      {members.length === 0 ? (
                        <p className="flex h-full min-h-[6rem] items-center justify-center rounded-md border border-dashed border-border-warm/80 px-2 text-center text-[12px] text-muted break-keep">
                          {isDropActive
                            ? "여기에 놓기"
                            : selecting
                              ? "선별 중…"
                              : "카드를 끌어다 놓기"}
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
                            onOpenDetail={() => setDetailNeedId(postit.id)}
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
          <div className="max-h-[12rem] overflow-y-auto overscroll-contain">
            <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {parked.map((postit) => (
                <div
                  key={postit.id}
                  className="min-w-0 rounded-md border border-border-warm bg-panel/80 px-2 py-1.5 text-[12px] font-medium leading-snug text-muted break-keep [overflow-wrap:anywhere]"
                >
                  {groupNames.get(postit.id) ? (
                    <p className="mb-0.5 truncate text-[10px] font-bold opacity-70">
                      <LocalizedText>{groupNames.get(postit.id)!}</LocalizedText>
                    </p>
                  ) : null}
                  <p className="line-clamp-2">
                    <LocalizedText>{postit.text}</LocalizedText>
                  </p>
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onChange(unparkNeed(data, postit.id))}
                      className={`${stageBtnSecondary} px-2 py-0.5 text-[11px]`}
                    >
                      다시 꺼내기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {detailPostit ? (
        <NeedDetailPopup
          postit={detailPostit}
          groupName={groupNames.get(detailPostit.id)}
          data={data}
          coreLimitReached={coreLimitReached}
          onChange={onChange}
          onCoreAddAttempt={handleCoreAddAttempt}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  );
}
