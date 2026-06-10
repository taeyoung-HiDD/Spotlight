"use client";

import { IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { SynthesisThemeChip } from "@/components/stage/stage4/SynthesisThemeChip";

interface SynthesisThemeAssignControlProps {
  noteId: string;
  theme: string;
  themes: string[];
  onThemeChange: (id: string, theme: string) => void;
}

export function SynthesisThemeAssignControl({
  noteId,
  theme,
  themes,
  onThemeChange,
}: SynthesisThemeAssignControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trimmed = theme.trim();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (themes.length === 0) return null;

  const pickTheme = (nextTheme: string) => {
    onThemeChange(noteId, nextTheme);
    setOpen(false);
  };

  const menu = open ? (
    <div
      role="listbox"
      aria-label="테마 선택"
      className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border-warm bg-panel py-1 shadow-[0_6px_20px_rgba(45,45,42,0.12)]"
    >
      {trimmed ? (
        <button
          type="button"
          role="option"
          onClick={() => pickTheme("")}
          className="block w-full px-2.5 py-1.5 text-left text-[12px] text-muted hover:bg-cream"
        >
          테마 없음
        </button>
      ) : null}
      {themes.map((item) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={item === trimmed}
          onClick={() => pickTheme(item)}
          className="block w-full px-2.5 py-1.5 text-left text-[12px] font-medium text-foreground hover:bg-cream"
        >
          {item}
        </button>
      ))}
    </div>
  ) : null;

  if (trimmed) {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="w-full"
          aria-label={`테마 ${trimmed}, 변경`}
          aria-expanded={open}
        >
          <SynthesisThemeChip
            theme={trimmed}
            themes={themes}
            className="w-full justify-center"
          />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-center rounded border border-dashed border-border-warm bg-panel/80 py-1.5 text-muted transition-colors hover:border-spotlight/50 hover:text-foreground"
        aria-label="테마 선택"
        aria-expanded={open}
      >
        <IconPlus className="size-3.5" stroke={2} aria-hidden />
      </button>
      {menu}
    </div>
  );
}
