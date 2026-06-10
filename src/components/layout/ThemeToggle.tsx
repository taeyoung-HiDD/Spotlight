"use client";

import {
  IconDeviceDesktop,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useThemePreference } from "@/hooks/useThemePreference";
import {
  THEME_PREFERENCE_LABELS,
  type ThemePreference,
} from "@/lib/theme/constants";

const OPTIONS: {
  id: ThemePreference;
  icon: typeof IconSun;
  label: string;
}[] = [
  { id: "system", icon: IconDeviceDesktop, label: THEME_PREFERENCE_LABELS.system },
  { id: "light", icon: IconSun, label: THEME_PREFERENCE_LABELS.light },
  { id: "dark", icon: IconMoon, label: THEME_PREFERENCE_LABELS.dark },
];

interface ThemeToggleProps {
  /** GNB 컴팩트(아이콘) / 기본(아이콘+라벨) */
  variant?: "compact" | "default";
}

/** GNB 우측 — System / Light / Dark 테마 전환 */
export function ThemeToggle({ variant = "compact" }: ThemeToggleProps) {
  const { preference, ready, setThemePreference } = useThemePreference();

  return (
    <div
      role="radiogroup"
      aria-label="화면 테마"
      className="flex items-center rounded-md border border-border-warm bg-cream p-0.5"
    >
      {OPTIONS.map(({ id, icon: Icon, label }) => {
        const selected = ready && preference === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${label} 테마`}
            title={label}
            onClick={() => setThemePreference(id)}
            className={[
              "flex items-center justify-center rounded-[5px] transition-colors",
              variant === "compact" ? "size-7" : "gap-1 px-2 py-1",
              selected
                ? "bg-panel text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="size-3.5" stroke={1.75} aria-hidden />
            {variant === "default" ? (
              <span className="text-[10px] font-medium">{label}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
