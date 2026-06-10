"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useRef } from "react";
import { useUiLocale } from "@/hooks/useUiLocale";
import { EmpathyPostitTextarea } from "@/components/stage/stage4/EmpathyPostitTextarea";
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
  const canAddQuadrantPostit =
    variant !== "quadrant" || items.length < EMPATHY_QUADRANT_MAX_VISIBLE;

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
      aria-label={`${labelKo} 포스트잇 추가`}
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
        {addButton}
      </div>
    );

  const quadrantTitle =
    labelEn.charAt(0) + labelEn.slice(1).toLowerCase();

  if (variant === "quadrant") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <p className="empathy-map-quadrant-label">{quadrantTitle}</p>
        <p className="empathy-map-quadrant-hint break-keep">
          {empathyQuadrantHint(quadrantId, uiLocale)}
        </p>
        <p className="sr-only">
          {labelKo} — {description}
        </p>
        {postits}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-warm bg-cream/40 p-3">
      <div className="mb-2">
        <p className={stageLabel}>
          {labelEn} · {labelKo}
        </p>
        <p className={`mt-0.5 ${stageCaption}`}>{description}</p>
      </div>
      {postits}
    </div>
  );
}
