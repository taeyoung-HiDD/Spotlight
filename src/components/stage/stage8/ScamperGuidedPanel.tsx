"use client";

import { IconChevronLeft, IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { SCAMPER_STEPS } from "@/lib/stages/stage8/scamperCatalog";
import {
  addIdeaToNextEmpty,
  filledIdeaCount,
  firstEmptyCellIndex,
  ideaById,
  type IdeaGridData,
} from "@/lib/stages/stage8/ideaGridTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageLabel,
} from "@/lib/stages/ui";

interface ScamperGuidedPanelProps {
  data: IdeaGridData;
  onChange: (data: IdeaGridData) => void;
  onClose: () => void;
}

export function ScamperGuidedPanel({
  data,
  onChange,
  onClose,
}: ScamperGuidedPanelProps) {
  const filledIdeas = data.slots
    .map((slot, index) => (slot ? { ...slot, cellIndex: index } : null))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const [sourceIdeaId, setSourceIdeaId] = useState(
    data.scamperSourceIdeaId || filledIdeas[0]?.id || "",
  );
  const [letterIndex, setLetterIndex] = useState(data.scamperLetterIndex);
  const [draftText, setDraftText] = useState("");

  const step = SCAMPER_STEPS[letterIndex] ?? SCAMPER_STEPS[0];
  const source = ideaById(data, sourceIdeaId);
  const hasEmpty = firstEmptyCellIndex(data) !== null;

  const addTwist = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !source || !hasEmpty) return;
    const title =
      trimmed.length > 36 ? `${trimmed.slice(0, 36)}…` : trimmed;
    onChange(
      addIdeaToNextEmpty(data, {
        title,
        description: trimmed,
        tags: [step.label, "SCAMPER"],
        sketchDataUrl: "",
        sourceHmwId: source.idea.sourceHmwId,
        sourceHmwText: source.idea.sourceHmwText,
        scamperLetter: step.letter,
        parentIdeaId: source.idea.id,
      }),
    );
    setDraftText("");
  };

  const goNextLetter = () => {
    if (letterIndex < SCAMPER_STEPS.length - 1) {
      setLetterIndex(letterIndex + 1);
      setDraftText("");
    }
  };

  if (filledIdeas.length === 0) {
    return (
      <div className="rounded-2xl border border-border-warm bg-panel p-5">
        <p className={`mb-3 ${stageCaption}`}>
          SCAMPER를 쓰려면 그리드에 아이디어를 하나 이상 적어 주세요.
        </p>
        <button type="button" onClick={onClose} className={stageBtnSecondary}>
          그리드로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            SCAMPER · 한 글자씩 함께
          </h3>
          <p className={`mt-1 ${stageCaption}`}>
            7글자로 같은 아이디어를 비틀어 보는 자리예요.
          </p>
        </div>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="rounded-md p-1 text-muted hover:bg-cream"
        >
          <IconX className="size-5" />
        </button>
      </div>

      <div className="rounded-xl border border-border-warm bg-panel p-4">
        <p className={`mb-3 ${stageLabel}`}>SCAMPER 진행</p>
        <div className="flex gap-1.5">
          {SCAMPER_STEPS.map((item, idx) => {
            const active = idx === letterIndex;
            const done = idx < letterIndex;
            return (
              <button
                key={item.letter}
                type="button"
                onClick={() => {
                  setLetterIndex(idx);
                  setDraftText("");
                }}
                className={[
                  "flex min-h-[52px] flex-1 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-center transition-colors",
                  active
                    ? "bg-spotlight text-on-spotlight shadow-sm"
                    : done
                      ? "bg-surface text-foreground"
                      : "border border-border-warm bg-cream text-muted",
                ].join(" ")}
              >
                <span className="text-base font-bold leading-none">
                  {item.letter}
                </span>
                <span className="mt-0.5 text-[9px] leading-tight break-keep">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border-warm bg-panel p-4">
          <div className="mb-3 rounded-lg border border-spotlight/40 bg-highlight px-3 py-2.5">
            <p className="text-[10px] font-medium tracking-wide text-gold uppercase">
              {step.letter} · {step.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground break-keep">
              {step.prompt}
            </p>
          </div>
          <p className={`text-sm leading-relaxed text-foreground break-keep`}>
            예를 들어 {step.example}
          </p>
        </div>

        <div className="rounded-xl border border-border-warm bg-panel p-4">
          <div className="mb-3">
            <p className={`mb-1.5 ${stageCaption}`}>원본 아이디어</p>
            <select
              value={sourceIdeaId}
              onChange={(e) => setSourceIdeaId(e.target.value)}
              className={`${stageField} mb-2 w-full text-sm`}
            >
              {filledIdeas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.title} · {idea.cellIndex + 1}번 칸
                </option>
              ))}
            </select>
            {source ? (
              <div className="rounded-lg border border-spotlight/35 bg-highlight px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground">
                  {source.idea.title}
                </p>
                {source.idea.description ? (
                  <p className={`mt-1 ${stageCaption} break-keep`}>
                    {source.idea.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className={`mb-2 ${stageCaption}`}>
            {step.letter}로 비틀어본 후보
          </p>
          <div className="space-y-2">
            {[step.example].map((candidate) => (
              <button
                key={candidate}
                type="button"
                disabled={!hasEmpty}
                onClick={() => addTwist(candidate)}
                className="flex w-full items-start gap-2 rounded-lg border border-border-warm bg-cream px-3 py-2 text-left text-sm hover:border-spotlight/40 disabled:opacity-50"
              >
                <IconPlus className="mt-0.5 size-4 shrink-0 text-muted" />
                <span className="break-keep">{candidate}</span>
              </button>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="직접 적기"
                className={`${stageField} min-w-0 flex-1 text-sm`}
              />
              <button
                type="button"
                disabled={!draftText.trim() || !hasEmpty}
                onClick={() => addTwist(draftText)}
                className={stageBtnSecondary}
              >
                추가
              </button>
            </div>
          </div>

          {!hasEmpty ? (
            <p className={`mt-2 ${stageCaption} text-gold`}>
              칸이 가득 찼어요. 비운 칸이 있으면 추가할 수 있어요.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={stageCaption}>
          {filledIdeaCount(data)}개 아이디어 · {step.letter} 자리 진행 중
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={stageBtnSecondary}>
            <IconChevronLeft className="mr-1 inline size-4" />
            그리드로
          </button>
          {letterIndex < SCAMPER_STEPS.length - 1 ? (
            <button type="button" onClick={goNextLetter} className={stageBtnPrimary}>
              다음 글자 →
            </button>
          ) : (
            <button type="button" onClick={onClose} className={stageBtnPrimary}>
              SCAMPER 마치기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
