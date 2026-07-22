"use client";

import { IconSend } from "@tabler/icons-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { CoachInputGuidePanel } from "@/components/stage/motion/CoachInputGuide";
import {
  COACH_MESSAGE_PLACEHOLDER,
  COACH_MESSAGE_PLACEHOLDER_EN,
} from "@/lib/coach/constants";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import { useUiLocale } from "@/hooks/useUiLocale";
import { parseAnswerTokens } from "@/lib/stages/stage2/contextualAnswers";
import {
  stageCoachComposerHint,
  stageCoachComposerInput,
  stageCoachComposerShell,
  stageCoachSendBtn,
} from "@/lib/stages/ui";

function joinDraftTokens(tokens: string[]): string {
  return tokens.join(", ");
}

function appendDraftToken(draft: string, token: string): string {
  const tokens = parseAnswerTokens(draft);
  if (tokens.includes(token)) return joinDraftTokens(tokens);
  return joinDraftTokens([...tokens, token]);
}

function removeDraftToken(draft: string, token: string): string {
  return joinDraftTokens(parseAnswerTokens(draft).filter((t) => t !== token));
}

interface CoachMessageComposerProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 입력 대기 시 예시 가이드 (전역) */
  inputGuide?: CoachInputGuide;
  /** true일 때만 예시 가이드 노출 */
  showGuide?: boolean;
  /** 예시 칩·입력창 레이아웃 후 스크롤 맞춤 */
  onLayoutChange?: () => void;
}

export function CoachMessageComposer({
  onSend,
  placeholder,
  disabled = false,
  inputGuide,
  showGuide = true,
  onLayoutChange,
}: CoachMessageComposerProps) {
  const locale = useUiLocale();
  const defaultPlaceholder =
    locale === "en" ? COACH_MESSAGE_PLACEHOLDER_EN : COACH_MESSAGE_PLACEHOLDER;
  const [draft, setDraft] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const multiSelectExamples = Boolean(inputGuide?.examplesMultiSelect);

  useEffect(() => {
    setDraft("");
  }, [inputGuide?.title, inputGuide?.examplesMultiSelect]);

  const draftTokens = useMemo(() => parseAnswerTokens(draft), [draft]);

  const chipsInDraft = useMemo(
    () =>
      inputGuide?.examples.filter((ex) => draftTokens.includes(ex)) ?? [],
    [draftTokens, inputGuide?.examples],
  );

  const submit = useCallback(() => {
    const text = joinDraftTokens(draftTokens);
    if (!text || disabled) return;
    onSend(text);
    setDraft("");
  }, [disabled, draftTokens, onSend]);

  const examplesReferenceOnly = Boolean(inputGuide?.examplesReferenceOnly);

  const pickExample = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || disabled) return;
      if (multiSelectExamples) {
        setDraft((prev) => appendDraftToken(prev, trimmed));
        return;
      }
      if (examplesReferenceOnly) {
        setDraft(trimmed);
        return;
      }
      onSend(trimmed);
    },
    [disabled, examplesReferenceOnly, multiSelectExamples, onSend],
  );

  const toggleExample = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setDraft((prev) =>
      parseAnswerTokens(prev).includes(trimmed)
        ? removeDraftToken(prev, trimmed)
        : appendDraftToken(prev, trimmed),
    );
  }, [disabled]);

  const resolvedPlaceholder =
    inputGuide?.placeholder ?? placeholder ?? defaultPlaceholder;
  const hasExampleChips = Boolean(inputGuide?.examples?.length);
  const canSubmit = draftTokens.length > 0;
  const guideVisible = Boolean(inputGuide && showGuide && hasExampleChips);

  useLayoutEffect(() => {
    onLayoutChange?.();
  }, [
    onLayoutChange,
    guideVisible,
    disabled,
    inputGuide?.title,
    inputGuide?.examples?.length,
    inputGuide?.placeholder,
  ]);

  return (
    <div className={stageCoachComposerShell}>
      {inputGuide && showGuide && hasExampleChips ? (
        <CoachInputGuidePanel
          guide={inputGuide}
          disabled={disabled}
          onPickExample={pickExample}
          examplesReferenceOnly={examplesReferenceOnly}
          selectedExamples={multiSelectExamples ? chipsInDraft : []}
          onToggleExample={multiSelectExamples ? toggleExample : undefined}
        />
      ) : null}
      <label className="sr-only">코치에게 메시지 보내기</label>
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            setDraft(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              if (e.nativeEvent.isComposing || isComposing) return;
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={resolvedPlaceholder}
          className={stageCoachComposerInput}
        />
        <button
          type="button"
          disabled={disabled || !canSubmit}
          onClick={submit}
          className={stageCoachSendBtn}
          aria-label="메시지 보내기"
        >
          <IconSend className="size-4" stroke={2} />
        </button>
      </div>
      <p className={stageCoachComposerHint}>
        {hasExampleChips
          ? multiSelectExamples
            ? "예시를 누르면 입력란에 추가돼요 · 직접 입력도 함께 가능 · Enter 전송"
            : examplesReferenceOnly
              ? "예시는 참고용이에요 · 누르면 입력란에 채워져요 · Enter 전송"
              : "예시를 누르면 바로 전송돼요 · Enter 전송"
          : "Enter 전송"}
      </p>
    </div>
  );
}
