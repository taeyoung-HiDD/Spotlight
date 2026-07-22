"use client";

import {
  IconDeviceDesktop,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";
import { useThemePreference } from "@/hooks/useThemePreference";
import { useT } from "@/hooks/useT";
import type { ThemePreference } from "@/lib/theme/constants";

const OPTIONS: {
  id: ThemePreference;
  icon: typeof IconSun;
  labelKey: "theme.system" | "theme.light" | "theme.dark";
}[] = [
  { id: "system", icon: IconDeviceDesktop, labelKey: "theme.system" },
  { id: "light", icon: IconSun, labelKey: "theme.light" },
  { id: "dark", icon: IconMoon, labelKey: "theme.dark" },
];

interface ThemeToggleProps {
  /** GNB 컴팩트(아이콘) / 기본(아이콘+라벨) */
  variant?: "compact" | "default";
}

/** GNB 우측 — System / Light / Dark 테마 전환 */
export function ThemeToggle({ variant = "compact" }: ThemeToggleProps) {
  const { preference, ready, setThemePreference } = useThemePreference();
  const t = useT();

  return (
    <div
      role="radiogroup"
      aria-label={t("theme.aria")}
      className="flex items-center rounded-md border border-border-warm bg-cream p-0.5"
    >
      {OPTIONS.map(({ id, icon: Icon, labelKey }) => {
        const selected = ready && preference === id;
        const label = t(labelKey);
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
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
