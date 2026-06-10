"use client";

import { IconPlus } from "@tabler/icons-react";
import { SynthesisKindHoverChip } from "@/components/stage/stage4/SynthesisKindHoverChip";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
import { SynthesisThemeAssignControl } from "@/components/stage/stage4/SynthesisThemeAssignControl";
import { POSTIT_SHELL_WIDTH } from "@/lib/stages/stage4/postitLayout";
import { themeColorForName } from "@/lib/stages/stage4/synthesisThemeColors";
import {
  SYNTHESIS_NOTE_KINDS,
  type SynthesisNote,
  type SynthesisNoteKind,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import { stageCaption } from "@/lib/stages/ui";

interface SynthesisPostitBoardProps {
  notes: SynthesisNote[];
  themes: string[];
  onAdd: (kind: SynthesisNoteKind) => void;
  onChange: (id: string, text: string) => void;
  onThemeChange: (id: string, theme: string) => void;
  onRemove: (id: string) => void;
}

export function SynthesisPostitBoard({
  notes,
  themes,
  onAdd,
  onChange,
  onThemeChange,
  onRemove,
}: SynthesisPostitBoardProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {SYNTHESIS_NOTE_KINDS.map((kindMeta) => (
          <div
            key={kindMeta.id}
            className="flex flex-wrap items-center gap-1.5"
          >
            <SynthesisKindHoverChip
              description={kindMeta.description}
              className={[
                "items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium text-foreground",
                kindMeta.legendClass,
              ].join(" ")}
            >
              <span className="font-semibold">{kindMeta.label}</span>
              <span className="text-muted">· {kindMeta.colorHint}</span>
            </SynthesisKindHoverChip>
            <button
              type="button"
              onClick={() => onAdd(kindMeta.id)}
              aria-label={`${kindMeta.label} 추가`}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-dashed border-border-warm px-2 py-1 text-[13px] font-semibold text-foreground hover:border-spotlight hover:bg-highlight"
            >
              <IconPlus className="size-3.5" stroke={2} aria-hidden />
              추가
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        {notes.length === 0 ? (
          <p
            className={`w-full rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-6 text-center ${stageCaption}`}
          >
            위에서 색을 고른 뒤 추가하면, 오른쪽부터 채워지고 줄이 가득 차면
            아래로 이어져요.
          </p>
        ) : null}
        {notes.map((note) => {
          const themeColor = note.theme.trim()
            ? themeColorForName(note.theme, themes)
            : null;

          return (
          <div key={note.id} className={`flex flex-col gap-1 ${POSTIT_SHELL_WIDTH}`}>
            <div
              className={[
                "rounded-sm",
                themeColor ? `ring-2 ${themeColor.ringClass}` : "",
              ].join(" ")}
            >
              <div
                className={`synthesis-postit-paper synthesis-postit-paper--${note.kind}`}
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
            </div>
            <SynthesisThemeAssignControl
              noteId={note.id}
              theme={note.theme}
              themes={themes}
              onThemeChange={onThemeChange}
            />
          </div>
          );
        })}
      </div>
    </div>
  );
}
