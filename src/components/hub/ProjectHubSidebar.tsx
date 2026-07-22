import {
  IconArchive,
  IconFolder,
  IconHistory,
  IconLayoutSidebarLeftCollapse,
} from "@tabler/icons-react";
import {
  WORKSPACE_HOME_PAGE_NAME,
  WORKSPACE_HOME_PAGE_NAME_EN,
} from "@/lib/navigation/stageNavLabels";
import { SIDEBAR_MACRO_GROUPS } from "@/lib/stages/sidebarNav";

/** 컷 21 · 평행 자리 사이드바 (허브 활성 · 단계 미리보기 비활성) */
export function ProjectHubSidebar() {
  return (
    <aside
      className="flex h-[calc(100vh-52px)] w-[244px] shrink-0 flex-col border-r border-border-warm bg-panel py-3.5"
      aria-label="평행 자리"
    >
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="text-[9px] font-semibold tracking-wide text-muted uppercase">
          평행 자리
        </div>
        <button
          type="button"
          className="rounded p-0.5 text-muted"
          aria-label="사이드바 접기 (준비 중)"
          disabled
        >
          <IconLayoutSidebarLeftCollapse className="size-3.5" stroke={1.75} />
        </button>
      </div>

      <div className="mb-3 px-2">
        <div className="flex items-center gap-2 rounded-lg border border-spotlight bg-highlight px-2.5 py-2">
          <IconFolder className="size-[15px] shrink-0 text-gold" stroke={1.75} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-foreground">
              {WORKSPACE_HOME_PAGE_NAME}
            </div>
            <div className="text-[9.5px] text-gold">{WORKSPACE_HOME_PAGE_NAME_EN}</div>
          </div>
        </div>
      </div>

      <div className="mb-2.5 px-2">
        <nav className="flex flex-col gap-0.5" aria-label={`${WORKSPACE_HOME_PAGE_NAME} 메뉴`}>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <IconArchive className="size-[14px] text-foreground" stroke={1.75} />
            <span className="text-[11px] text-foreground">자료실</span>
            <span className="ml-auto rounded bg-cream px-[5px] py-px text-[9.5px] text-muted">
              38
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <IconHistory className="size-[14px] text-foreground" stroke={1.75} />
            <span className="text-[11px] text-foreground">코치 메모리</span>
          </div>
        </nav>
      </div>

      <div className="border-t border-border-warm px-4 pt-2.5 pb-2">
        <div className="text-[9px] font-semibold tracking-wide text-subtle uppercase">
          단계 진행 · 안심 매대
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 opacity-55" aria-hidden>
        {SIDEBAR_MACRO_GROUPS.slice(0, 3).map((group) => {
          const MacroIcon = group.icon;
          const stageLabel = group.stages.map((s) => s.id).join("·");

          return (
            <div key={group.id} className="mb-1.5">
              <div className="flex items-center gap-1 px-2 py-1">
                <MacroIcon className="size-[11px] text-muted" stroke={1.75} />
                <span className="text-[9px] font-semibold tracking-wide text-muted">
                  {group.label}
                </span>
                <div className="ml-0.5 h-px flex-1 bg-border-warm" />
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1">
                <div className="flex size-4 items-center justify-center rounded-full border border-badge-fill-ring bg-badge-fill">
                  <span className="text-[8px] text-badge-on-fill">✓</span>
                </div>
                <span className="text-[10.5px] text-foreground">{stageLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
