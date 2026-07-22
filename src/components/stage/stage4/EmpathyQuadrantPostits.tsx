"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useRef } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { EmpathyPostitTextarea } from "@/components/stage/stage4/EmpathyPostitTextarea";
import { useUiLocale } from "@/hooks/useUiLocale";
import { useArchiveView } from "@/lib/archive/archiveViewContext";
import type { EmpathyQuadrantId, EmpathyStickyItem } from "@/lib/stages/stage2/empathyMap";
import {
  EMPATHY_QUADRANT_MAX_VISIBLE,
  empathyQuadrantHint,
  empathyQuadrantPostitExample,
  empathyQuadrantTowardCenterPad,
} from "@/lib/stages/stage2/empathyMap";
import { createEmpathyStickyItem } from "@/lib/stages/stage4/empathySticky";
import { stageCaption, stageLabel } from "@/lib/stages/ui";

const POSTIT_PAPER_CLASS: Record<EmpathyQuadrantId, string> = {
  says: "empathy-postit-paper--says",
  thinks: "empathy-postit-paper--thinks",
  does: "empathy-postit-paper--does",
  feels: "empathy-postit-paper--feels",
};

interface EmpathyQuadrantPostitsProps {
  quadrantId: EmpathyQuadrantId;
  labelEn: string;
  labelKo: string;
  description: string;
  items: EmpathyStickyItem[];
  onChange: (items: EmpathyStickyItem[]) => void;
  /** quadrant: 공감맵 4분면 셀 · card: 레거시 카드형 */
  variant?: "quadrant" | "card";
}

export function EmpathyQuadrantPostits({
  quadrantId,
  labelEn,
  labelKo,
  description,
  items,
  onChange,
  variant = "card",
}: EmpathyQuadrantPostitsProps) {
  const focusIdRef = useRef<string | null>(null);
  const uiLocale = useUiLocale();
  const archiveView = useArchiveView();
  const canAddQuadrantPostit =
    !archiveView &&
    (variant !== "quadrant" || items.length < EMPATHY_QUADRANT_MAX_VISIBLE);
  const title = uiLocale === "en" ? labelEn : labelKo;
  /** 우측 사분면(생각함·느낌)은 중앙 프로필과 겹치지 않도록 제목·힌트를 우측 정렬 */
  const alignEnd =
    variant === "quadrant" &&
    (quadrantId === "thinks" || quadrantId === "feels");

  const updateItemText = useCallback(
    (id: string, text: string) => {
      onChange(
        items.map((item) => (item.id === id ? { ...item, text } : item)),
      );
    },
    [items, onChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      onChange(items.filter((item) => item.id !== id));
    },
    [items, onChange],
  );

  const addItem = useCallback(() => {
    if (!canAddQuadrantPostit) return;
    const next = createEmpathyStickyItem();
    focusIdRef.current = next.id;
    onChange([...items, next]);
  }, [canAddQuadrantPostit, items, onChange]);

  const renderPostit = (item: EmpathyStickyItem, index: number) => {
    const isQuadrant = variant === "quadrant";
    const showExample = index === 0 && !item.text.trim();

    const paper = (
      <div
        className={[
          "empathy-postit-paper",
          isQuadrant ? "empathy-postit-paper--quadrant" : "shrink-0",
          POSTIT_PAPER_CLASS[quadrantId],
        ].join(" ")}
      >
        {!archiveView ? (
          <button
            type="button"
            className="empathy-postit-remove"
            aria-label="포스트잇 삭제"
            onClick={() => removeItem(item.id)}
          >
            <span className="empathy-postit-remove-x" aria-hidden>
              ×
            </span>
          </button>
        ) : null}
        {archiveView ? (
          <p className="empathy-postit-text whitespace-pre-wrap break-keep px-2 py-1.5 text-[13px] leading-relaxed">
            {item.text.trim() ? (
              <LocalizedText>{item.text}</LocalizedText>
            ) : (
              <span className="text-muted">
                {empathyQuadrantPostitExample(quadrantId, uiLocale)}
              </span>
            )}
          </p>
        ) : (
          <EmpathyPostitTextarea
            value={item.text}
            onChange={(text) => updateItemText(item.id, text)}
            placeholder={
              showExample
                ? empathyQuadrantPostitExample(quadrantId, uiLocale)
                : ""
            }
            compact={isQuadrant}
            onMountRef={(el) => {
              if (el && focusIdRef.current === item.id) {
                el.focus();
                focusIdRef.current = null;
              }
            }}
          />
        )}
      </div>
    );

    if (!isQuadrant) {
      return <div key={item.id}>{paper}</div>;
    }

    return (
      <div key={item.id} className="empathy-quadrant-postit-cell">
        {paper}
      </div>
    );
  };

  const addButtonPaper = (
    <button
      type="button"
      onClick={addItem}
      aria-label={`${title} add sticky`}
      className={[
        "empathy-postit-paper empathy-postit-paper--add flex items-center justify-center",
        variant === "quadrant"
          ? "empathy-postit-paper--quadrant"
          : "shrink-0",
      ].join(" ")}
    >
      <IconPlus
        className={[
          "empathy-postit-add-icon",
          variant === "quadrant" ? "size-4" : "size-6",
        ].join(" ")}
        stroke={2}
        aria-hidden
      />
    </button>
  );

  const addButton =
    variant === "quadrant" ? (
      <div className="empathy-quadrant-postit-cell">{addButtonPaper}</div>
    ) : (
      addButtonPaper
    );

  const postits =
    variant === "quadrant" ? (
      <div
        className={[
          "empathy-quadrant-postit-area min-h-0 flex-1",
          empathyQuadrantTowardCenterPad(quadrantId),
        ].join(" ")}
      >
        <div className="empathy-quadrant-postit-flex">
          {items.map((item, index) => renderPostit(item, index))}
          {canAddQuadrantPostit ? addButton : null}
        </div>
      </div>
    ) : (
      <div className="flex min-h-[19rem] flex-wrap items-start gap-2">
        {items.map((item, index) => renderPostit(item, index))}
        {canAddQuadrantPostit ? addButton : null}
      </div>
    );

  return (
    <div
      className={
        variant === "quadrant"
          ? "flex h-full min-h-0 flex-col"
          : "flex flex-col gap-2"
      }
    >
      <div
        className={
          variant === "quadrant"
            ? [
                "shrink-0 px-1 pb-1",
                alignEnd ? "pr-2 text-right sm:pr-3" : "pl-1 sm:pl-2",
              ].join(" ")
            : undefined
        }
      >
        <p className={stageLabel}>
          {title}
          {uiLocale === "ko" ? (
            <span className="ml-1.5 font-normal text-muted">{labelEn}</span>
          ) : null}
        </p>
        <p className={`${stageCaption} text-muted`}>
          {empathyQuadrantHint(quadrantId, uiLocale)}
        </p>
        {variant === "card" ? (
          <p className={`${stageCaption} mt-0.5 text-muted`}>{description}</p>
        ) : null}
      </div>
      {postits}
    </div>
  );
}
