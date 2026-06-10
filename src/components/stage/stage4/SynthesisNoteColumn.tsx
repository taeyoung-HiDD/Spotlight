"use client";

import { IconPlus } from "@tabler/icons-react";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
import { SynthesisKindHoverChip } from "@/components/stage/stage4/SynthesisKindHoverChip";
import type { SynthesisNoteKind } from "@/lib/stages/stage4/researchSynthesisTypes";
import { stageCaption, stageLabel } from "@/lib/stages/ui";

interface SynthesisNoteColumnProps {
  kind: SynthesisNoteKind;
  label: string;
  colorHint: string;
  description: string;
  headerClass: string;
  notes: { id: string; text: string; theme: string }[];
  themes: string[];
  onAdd: () => void;
  onChange: (id: string, text: string) => void;
  onThemeChange: (id: string, theme: string) => void;
  onRemove: (id: string) => void;
}

export function SynthesisNoteColumn({
  kind,
  label,
  colorHint,
  description,
  headerClass,
  notes,
  themes,
  onAdd,
  onChange,
  onThemeChange,
  onRemove,
}: SynthesisNoteColumnProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <SynthesisKindHoverChip
          description={description}
          className={`rounded-md border px-2.5 py-1.5 ${headerClass}`}
        >
          <div>
            <p className={stageLabel}>{label}</p>
            <p className={stageCaption}>{colorHint}</p>
          </div>
        </SynthesisKindHoverChip>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`${label} 추가`}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-border-warm px-2 py-1 text-[13px] font-semibold text-foreground hover:border-spotlight hover:bg-highlight"
        >
          <IconPlus className="size-3.5" stroke={2} aria-hidden />
          추가
        </button>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {notes.length === 0 ? (
          <p
            className={`w-full rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-4 text-center ${stageCaption}`}
          >
            아직 없어요
          </p>
        ) : null}
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex w-[clamp(10.4rem,100%,13.5rem)] flex-col gap-1"
          >
            <div
              className={`synthesis-postit-paper synthesis-postit-paper--${kind}`}
            >
              <button
                type="button"
                aria-label="삭제"
                onClick={() => onRemove(note.id)}
                className="synthesis-postit-remove"
              >
                <span className="empathy-postit-remove-x">×</span>
              </button>
              <SynthesisPostitTextarea
                value={note.text}
                onChange={(text) => onChange(note.id, text)}
              />
            </div>
            {themes.length > 0 ? (
              <select
                value={note.theme}
                onChange={(e) => onThemeChange(note.id, e.target.value)}
                className="w-full rounded border border-border-warm/60 bg-white/80 px-1.5 py-0.5 text-[12px] text-foreground"
                aria-label="테마"
              >
                <option value="">테마 없음</option>
                {themes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
