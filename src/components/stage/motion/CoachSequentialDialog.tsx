"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CoachDialogMessage } from "@/components/stage/motion/CoachDialogMessage";
import { CoachTypingIndicator } from "@/components/stage/motion/CoachTypingIndicator";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MOTION, sleep } from "@/lib/motion/timings";

export type CoachDialogItem =
  | {
      type: "bubble";
      content: ReactNode;
      variant?: "primary" | "secondary";
    }
  | {
      type: "highlight";
      label: string;
      content: ReactNode;
    };

interface CoachSequentialDialogProps {
  messages: CoachDialogItem[];
  sceneKey: string;
  onComplete?: () => void;
  onTypingChange?: (typing: boolean) => void;
  onProgress?: () => void;
}

function dialogRunKey(sceneKey: string, messages: CoachDialogItem[]): string {
  const body = messages
    .map((item) => {
      if (item.type === "highlight") {
        return `h:${item.label}:${String(item.content)}`;
      }
      return `b:${String(item.content)}`;
    })
    .join("\n");
  return `${sceneKey}|${messages.length}|${body}`;
}

export function CoachSequentialDialog({
  messages,
  sceneKey,
  onComplete,
  onTypingChange,
  onProgress,
}: CoachSequentialDialogProps) {
  const reducedMotion = useReducedMotion();
  const [doneCount, setDoneCount] = useState(
    reducedMotion ? messages.length : 0,
  );
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const [showTyping, setShowTyping] = useState(false);
  const streamDoneRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  const completedRunKeyRef = useRef<string | null>(null);
  onCompleteRef.current = onComplete;

  const scrollProgress = useCallback(() => {
    onProgress?.();
  }, [onProgress]);

  const handleStreamComplete = useCallback(() => {
    streamDoneRef.current?.();
    streamDoneRef.current = null;
  }, []);

  useEffect(() => {
    onTypingChange?.(
      showTyping || (streamingIndex !== null && !reducedMotion),
    );
  }, [showTyping, streamingIndex, reducedMotion, onTypingChange]);

  useEffect(() => {
    if (showTyping) onProgress?.();
  }, [showTyping, onProgress]);

  useEffect(() => {
    if (streamingIndex !== null) onProgress?.();
  }, [streamingIndex, onProgress]);

  useEffect(() => {
    const runKey = dialogRunKey(sceneKey, messages);

    if (reducedMotion) {
      setDoneCount(messages.length);
      setStreamingIndex(null);
      setShowTyping(false);
      completedRunKeyRef.current = runKey;
      onCompleteRef.current?.();
      return;
    }

    if (completedRunKeyRef.current === runKey) {
      setDoneCount(messages.length);
      setStreamingIndex(null);
      setShowTyping(false);
      onCompleteRef.current?.();
      return;
    }

    let cancelled = false;

    async function runSequence() {
      setDoneCount(0);
      setStreamingIndex(null);
      setShowTyping(false);
      await sleep(MOTION.coachDialogStartDelayMs);
      if (cancelled) return;

      for (let i = 0; i < messages.length; i++) {
        if (i > 0) {
          setShowTyping(true);
          await sleep(MOTION.coachTypingMs);
          if (cancelled) return;
          setShowTyping(false);
          await sleep(MOTION.coachFirstMessageDelayMs);
        } else {
          await sleep(MOTION.coachFirstMessageDelayMs);
        }

        if (cancelled) return;

        await new Promise<void>((resolve) => {
          streamDoneRef.current = () => {
            setDoneCount(i + 1);
            setStreamingIndex(null);
            resolve();
          };
          setStreamingIndex(i);
        });
      }

      if (!cancelled) {
        completedRunKeyRef.current = runKey;
        onCompleteRef.current?.();
      }
    }

    runSequence();

    return () => {
      cancelled = true;
      streamDoneRef.current = null;
    };
  }, [messages, sceneKey, reducedMotion]);

  useEffect(() => {
    completedRunKeyRef.current = null;
  }, [sceneKey]);

  return (
    <div className="space-y-2.5">
      {messages.map((item, index) => {
        if (index < doneCount && index !== streamingIndex) {
          return (
            <CoachDialogMessage
              key={`${sceneKey}-static-${index}`}
              item={item}
              mode="static"
              sceneKey={sceneKey}
              index={index}
            />
          );
        }
        if (index === streamingIndex) {
          return (
            <CoachDialogMessage
              key={`${sceneKey}-stream-${index}`}
              item={item}
              mode="stream"
              sceneKey={sceneKey}
              index={index}
              onComplete={handleStreamComplete}
              onProgress={scrollProgress}
            />
          );
        }
        return null;
      })}
      {showTyping ? <CoachTypingIndicator /> : null}
    </div>
  );
}
