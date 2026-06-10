"use client";

import type { ReactNode } from "react";
import { stageCaption } from "@/lib/stages/ui";

interface StageWorkDiscoveryPlaceholderProps {
  /** 작업 영역 상단 캡션 (선택) */
  caption?: string;
  children: ReactNode;
}

/** 코치 대화 수집 중 — 좌측 작업 영역 대기 안내 */
export function StageWorkDiscoveryPlaceholder({
  caption,
  children,
}: StageWorkDiscoveryPlaceholderProps) {
  return (
    <div className="space-y-3">
      {caption ? <p className={stageCaption}>{caption}</p> : null}
      <div className="rounded-xl border border-dashed border-border-warm bg-surface/40 px-4 py-10 text-center text-[16px] text-muted break-keep">
        {children}
      </div>
    </div>
  );
}
