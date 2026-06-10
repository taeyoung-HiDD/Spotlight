import Link from "next/link";

type HiDDCoachBrandProps = {
  /** 마케팅 GNB(다크) / 라이트 서피스 */
  variant?: "dark" | "light";
  href?: string;
  className?: string;
};

/**
 * HiDD Coach _standalone_.html · ServiceMark
 * @see _reference_html/HiDD Coach _standalone_.html (TopBar)
 */
export function HiDDCoachBrand({
  variant = "dark",
  href = "/",
  className = "",
}: HiDDCoachBrandProps) {
  const isDark = variant === "dark";

  const mark = (
    <div className={`flex items-center gap-[9px] ${className}`}>
      <div
        className={[
          "relative flex size-[30px] items-center justify-center rounded-[9px]",
          isDark ? "bg-off-white" : "bg-charcoal",
        ].join(" ")}
        aria-hidden
      >
        <span
          className={[
            "mr-0.5 font-mono text-sm font-medium",
            isDark ? "text-charcoal" : "text-white",
          ].join(" ")}
        >
          !i
        </span>
        <span className="absolute right-1 top-1 size-[5px] rounded-full bg-spotlight" />
      </div>

      <div className="flex flex-col leading-[1.15]">
        <div
          className={[
            "text-[15px] font-bold tracking-[-0.2px]",
            isDark ? "text-white" : "text-foreground",
          ].join(" ")}
        >
          HiDD <span className="text-gold">Coach</span>
        </div>
        <div
          className={[
            "mt-[3px] font-mono text-[9.5px] font-medium uppercase tracking-[0.5px]",
            isDark ? "text-white/55" : "text-muted",
          ].join(" ")}
        >
          design thinking · v1
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="shrink-0 no-underline">
        {mark}
      </Link>
    );
  }

  return mark;
}
