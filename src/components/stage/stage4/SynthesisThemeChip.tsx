import { themeColorForName } from "@/lib/stages/stage4/synthesisThemeColors";

interface SynthesisThemeChipProps {
  theme: string;
  themes: string[];
  className?: string;
}

export function SynthesisThemeChip({
  theme,
  themes,
  className = "",
}: SynthesisThemeChipProps) {
  const color = themeColorForName(theme, themes);
  return (
    <span
      className={[
        "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[12px] font-semibold break-keep",
        color.chipClass,
        className,
      ].join(" ")}
    >
      <span className="truncate">{theme}</span>
    </span>
  );
}
