"use client";

import { IconArrowRight } from "@tabler/icons-react";
import {
  stageCoachBtnPrimary,
  stageCoachCaption,
  stagePanel,
} from "@/lib/stages/ui";

interface StageContinueGatePanelProps {
  onContinue: () => void;
  disabled?: boolean;
  /** 기본: 다음으로 이동 */
  buttonLabel?: string;
  caption?: string;
}

/** 화면(단계) 전환 전 — 코치 대화 종료 후 사용자 확인 */
export function StageContinueGatePanel({
  onContinue,
  disabled = false,
  buttonLabel = "다음으로 이동",
  caption,
}: StageContinueGatePanelProps) {
  return (
    <div className={stagePanel}>
      {caption ? (
        <p className={`mb-4 ${stageCoachCaption}`}>{caption}</p>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={onContinue}
        className={`${stageCoachBtnPrimary} inline-flex w-full items-center justify-center gap-1.5`}
      >
        {buttonLabel}
        <IconArrowRight className="size-4" stroke={2} aria-hidden />
      </button>
    </div>
  );
}
