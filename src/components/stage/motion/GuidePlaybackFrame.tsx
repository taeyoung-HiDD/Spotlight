"use client";

import { IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useUiLocale } from "@/hooks/useUiLocale";

const REPLAY_LABEL = { ko: "다시보기", en: "Replay" } as const;

interface GuidePlaybackFrameProps {
  isComplete: boolean;
  reducedMotion: boolean;
  onReplay: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * 단계 가이드 비주얼 예시를 감싸는 재생 래퍼 — 재생이 끝나면 "다시보기" 버튼을 보여줘요.
 * 모션 감소 환경에서는 애니메이션 없이 완성 상태만 보여주므로 버튼도 숨겨요.
 */
export function GuidePlaybackFrame({
  isComplete,
  reducedMotion,
  onReplay,
  children,
  className,
}: GuidePlaybackFrameProps) {
  const locale = useUiLocale();

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      {children}
      {isComplete && !reducedMotion ? (
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-warm bg-panel px-2.5 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-gold/50 hover:text-foreground"
          >
            <IconRefresh className="size-3.5" stroke={2} />
            {REPLAY_LABEL[locale]}
          </button>
        </div>
      ) : null}
    </div>
  );
}
