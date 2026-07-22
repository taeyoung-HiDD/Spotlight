"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { CoachBubble } from "@/components/stage/CoachPanel";
import { CoachRevealText } from "@/components/stage/motion/CoachRevealText";
import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { flattenCoachRevealSource } from "@/lib/motion/coachRevealSource";
import { MOTION, sleep } from "@/lib/motion/timings";
import {
  stageCoachHighlightBlock,
  stageCoachHighlightBody,
  stageCoachHighlightLabel,
} from "@/lib/stages/ui";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";

interface CoachDialogMessageProps {
  item: CoachDialogItem;
  mode: "static" | "stream";
  sceneKey: string;
  index: number;
  onComplete?: () => void;
  onProgress?: () => void;
}

function DialogBody({
  item,
  mode,
  onComplete,
  onProgress,
}: {
  item: CoachDialogItem;
  mode: "static" | "stream";
  onComplete?: () => void;
  onProgress?: () => void;
}) {
  const sourceText = typeof item.content === "string" ? item.content : "";
  const { text: localizedContent, translating: contentTranslating } =
    useLocalizedContent(sourceText);
  const labelSource = item.type === "highlight" ? item.label : "";
  const { text: localizedLabel, translating: labelTranslating } =
    useLocalizedContent(labelSource);
  const translating =
    (typeof item.content === "string" && contentTranslating) ||
    (item.type === "highlight" && labelTranslating);

  const displayContent: ReactNode =
    typeof item.content === "string" ? localizedContent : item.content;

  const staticContent =
    mode === "static" && typeof item.content === "string"
      ? formatCoachDialogBreaks(localizedContent)
      : displayContent;

  const revealPlain = useMemo(
    () =>
      typeof item.content === "string"
        ? flattenCoachRevealSource(localizedContent)
        : flattenCoachRevealSource(item.content),
    [item.content, localizedContent],
  );

  useEffect(() => {
    if (mode !== "stream") return;
    if (translating) return;
    if (!revealPlain) {
      let cancelled = false;
      void sleep(MOTION.coachPauseAfterMs).then(() => {
        if (!cancelled) onComplete?.();
      });
      return () => {
        cancelled = true;
      };
    }
  }, [mode, revealPlain, onComplete, translating]);

  if (item.type === "bubble") {
    const body =
      mode === "static" ? (
        staticContent
      ) : translating ? (
        localizedContent
      ) : revealPlain ? (
        <CoachRevealText
          text={revealPlain}
          onComplete={onComplete}
          onProgress={onProgress}
        />
      ) : (
        displayContent
      );

    return <CoachBubble variant={item.variant}>{body}</CoachBubble>;
  }

  const body =
    mode === "static" ? (
      staticContent
    ) : translating ? (
      localizedContent
    ) : revealPlain ? (
      <CoachRevealText
        text={revealPlain}
        onComplete={onComplete}
        onProgress={onProgress}
      />
    ) : (
      displayContent
    );

  return (
    <div className={stageCoachHighlightBlock}>
      <div className={stageCoachHighlightLabel}>{localizedLabel}</div>
      <div className={stageCoachHighlightBody}>{body}</div>
    </div>
  );
}

export function CoachDialogMessage({
  item,
  mode,
  sceneKey,
  index,
  onComplete,
  onProgress,
}: CoachDialogMessageProps) {
  return (
    <div
      key={`${sceneKey}-${mode}-${index}`}
      className="coach-message-in"
      style={{ animation: `coach-message-in ${MOTION.stageRevealMs}ms ease forwards` }}
    >
      <DialogBody
        item={item}
        mode={mode}
        onComplete={onComplete}
        onProgress={onProgress}
      />
    </div>
  );
}
