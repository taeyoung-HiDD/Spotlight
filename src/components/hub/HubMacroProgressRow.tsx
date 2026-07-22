import {
  getHubMacroStatus,
  HUB_MACRO_GROUPS,
} from "@/lib/stages/hubMacroGroups";
import type { MacroGroupStatus } from "@/lib/stages/sidebarNav";

interface HubMacroProgressRowProps {
  stage: number;
}

function segmentClass(status: MacroGroupStatus, isCurrent: boolean): string {
  if (isCurrent) return "bg-spotlight";
  if (status === "complete") return "bg-foreground/55";
  return "bg-border-warm/80";
}

function labelClass(status: MacroGroupStatus, isCurrent: boolean): string {
  if (isCurrent) return "font-semibold text-gold";
  if (status === "complete") return "text-foreground/70";
  return "text-muted";
}

/**
 * 허브 프로젝트 카드 — 4개 상위 매크로 라벨 + 구간 바
 */
export function HubMacroProgressRow({ stage }: HubMacroProgressRowProps) {
  const current = Math.min(Math.max(1, Math.round(stage)), 16);

  return (
    <div
      className="mb-2 grid grid-cols-4 gap-1.5"
      role="group"
      aria-label="상위 단계 진행"
    >
      {HUB_MACRO_GROUPS.map((group) => {
        const status = getHubMacroStatus(group.stages, current);
        const isCurrent = group.stages.includes(current);

        return (
          <div key={group.id} className="min-w-0">
            <div
              className={[
                "mb-1 h-1 rounded-sm",
                segmentClass(status, isCurrent),
              ].join(" ")}
              title={`${group.label}${isCurrent ? " · 현재" : status === "complete" ? " · 완료" : ""}`}
            />
            <span
              className={[
                "block truncate text-[9px] leading-tight break-keep",
                labelClass(status, isCurrent),
              ].join(" ")}
            >
              {group.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
