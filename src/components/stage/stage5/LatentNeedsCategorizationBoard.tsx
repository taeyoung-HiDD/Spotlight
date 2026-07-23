"use client";

import { useCallback, useMemo, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  LocalizedEditableInput,
} from "@/components/i18n/LocalizedEditableField";
import {
  ExpandableJourneyPostit,
  useJourneyPostitExpansion,
} from "@/components/stage/shared/ExpandableJourneyPostit";
import {
  applyCategorizedNeedGroups,
  requestNeedsCategorization,
} from "@/lib/stages/stage5/categorizeNeedsClient";
import {
  addNeedGroup,
  assignNeedToGroup,
  groupLatentNeeds,
  listLatentNeedPostits,
  removeNeedGroup,
  renameNeedGroup,
  sortedNeedGroups,
} from "@/lib/stages/stage5/latentNeedsGroups";
import type {
  Stage5BoardPostit,
  Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import {
  stageBtnSecondary,
  stageCaption,
  stageLabel,
} from "@/lib/stages/ui";

const DRAG_MIME = "application/x-spotlight-need-group-item";

function NeedCard({
  postit,
  large = false,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  postit: Stage5BoardPostit;
  large?: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={[
        "min-w-0 rounded-md border border-[#7E57C2]/40 bg-[#EDE7F6]/95 font-semibold text-[#1c1a16] break-keep [overflow-wrap:anywhere]",
        large
          ? "px-3 py-2.5 text-[15px] leading-relaxed"
          : "px-2 py-1.5 text-[12px] leading-snug",
        draggable ? "cursor-grab active:cursor-grabbing" : "",
        isDragging ? "opacity-45" : "",
      ].join(" ")}
    >
      <p
        className={[
          "mb-0.5 font-bold opacity-70",
          large ? "text-[12px]" : "text-[10px]",
        ].join(" ")}
      >
        잠재 니즈
      </p>
      <LocalizedText>{postit.text}</LocalizedText>
    </div>
  );
}

interface LatentNeedsCategorizationBoardProps {
  projectId: string;
  data: Stage5LatentNeedsData;
  onChange: (data: Stage5LatentNeedsData) => void;
}

export function LatentNeedsCategorizationBoard({
  projectId,
  data,
  onChange,
}: LatentNeedsCategorizationBoardProps) {
  const groups = useMemo(() => sortedNeedGroups(data), [data]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [recategorizing, setRecategorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { expandedPostitId, onExpandedChange } = useJourneyPostitExpansion();

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

  const allowDrop = (groupId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(groupId);
  };

  const handleDrop = useCallback(
    (groupId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      const needId = e.dataTransfer.getData(DRAG_MIME);
      if (!needId) return;
      onChange(assignNeedToGroup(data, needId, groupId));
      handleDragEnd();
    },
    [data, handleDragEnd, onChange],
  );

  const handleAiRecategorize = useCallback(async () => {
    const needs = listLatentNeedPostits(data).map((p) => ({
      id: p.id,
      text: p.text.trim(),
    }));
    if (needs.length === 0) {
      setError("분류할 잠재 니즈가 없어요.");
      return;
    }

    setRecategorizing(true);
    setError(null);
    try {
      const result = await requestNeedsCategorization(projectId, needs);
      onChange(applyCategorizedNeedGroups(data, result.groups));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "AI 재분류에 실패했습니다.",
      );
    } finally {
      setRecategorizing(false);
    }
  }, [data, onChange, projectId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={stageCaption}>
          비슷한 잠재 니즈를 같은 그룹에 모아 보세요. 그룹 이름을 바꾸고, 카드를
          다른 그룹으로 끌어다 옮길 수 있어요.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void handleAiRecategorize()}
            disabled={recategorizing}
            className={stageBtnSecondary}
          >
            {recategorizing ? "재분류 중…" : "AI로 재분류하기"}
          </button>
          <button
            type="button"
            onClick={() => onChange(addNeedGroup(data))}
            disabled={recategorizing}
            className="rounded-md border border-dashed border-border-warm bg-panel/80 px-2.5 py-1.5 text-[13px] font-semibold text-foreground transition-colors hover:border-spotlight/50 hover:bg-highlight/40 disabled:opacity-50"
          >
            + 그룹 추가
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-[13px] font-medium text-[#C62828] break-keep">
          {error}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-warm bg-cream/40 px-4 py-8 text-center">
          <p className={stageCaption}>
            아직 그룹이 없어요. 「+ 그룹 추가」로 시작해 보세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const members = groupLatentNeeds(data, group.id);
            const isDropActive = dropTarget === group.id;
            return (
              <section
                key={group.id}
                onDragOver={allowDrop(group.id)}
                onDragLeave={() =>
                  setDropTarget((current) =>
                    current === group.id ? null : current,
                  )
                }
                onDrop={handleDrop(group.id)}
                className={[
                  "flex min-h-[14rem] flex-col rounded-xl border bg-panel p-3 transition-colors",
                  isDropActive
                    ? "border-spotlight/70 bg-highlight/40"
                    : "border-border-warm",
                ].join(" ")}
              >
                <div className="mb-2 flex items-start gap-1.5">
                  <div className="min-w-0 flex-1">
                    <p className={`mb-1 ${stageLabel}`}>그룹 이름</p>
                    <LocalizedEditableInput
                      type="text"
                      value={group.name}
                      onValueChange={(name) =>
                        onChange(renameNeedGroup(data, group.id, name))
                      }
                      placeholder="예: 시간 압박"
                      className="w-full rounded-md border border-border-warm bg-cream/50 px-2 py-1.5 text-[14px] font-semibold outline-none placeholder:text-subtle focus:border-spotlight/50"
                      aria-label="그룹 이름"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange(removeNeedGroup(data, group.id))}
                    className={`${stageBtnSecondary} shrink-0 px-2 py-1.5 text-[12px]`}
                    aria-label={`${group.name} 그룹 삭제`}
                  >
                    삭제
                  </button>
                </div>

                <p className={`mb-2 ${stageCaption}`}>
                  {members.length}개 · 여기로 끌어다 놓기
                </p>

                <div className="flex flex-1 flex-col gap-2">
                  {members.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border-warm/80 px-2 py-6 text-center text-[12px] text-muted break-keep">
                      {isDropActive
                        ? "여기에 놓기"
                        : "잠재 니즈 카드를 끌어다 놓으세요"}
                    </p>
                  ) : (
                    members.map((postit) => (
                      <ExpandableJourneyPostit
                        key={postit.id}
                        postitId={postit.id}
                        expandedPostitId={expandedPostitId}
                        onExpandedChange={onExpandedChange}
                        expandedChildren={<NeedCard postit={postit} large />}
                      >
                        <NeedCard
                          postit={postit}
                          draggable
                          isDragging={draggingId === postit.id}
                          onDragStart={handleDragStart(postit.id)}
                          onDragEnd={handleDragEnd}
                        />
                      </ExpandableJourneyPostit>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
