"use client";

import { IconArrowRight } from "@tabler/icons-react";
import {
  stageCoachBtnPrimary,
  stageCoachCaption,
  stagePanel,
} from "@/lib/stages/ui";

interface Stage1HopesGatePanelProps {
  onContinue: () => void;
  disabled?: boolean;
}

/** 단계 1 · Hopes·Fears 대화 시작 전 확인 */
export function Stage1HopesGatePanel({
  onContinue,
  disabled = false,
}: Stage1HopesGatePanelProps) {
  return (
    <div className={stagePanel}>
      <p className={`mb-4 ${stageCoachCaption}`}>
        프로젝트 이름과 팀 여부를 정리했어요. 다음은 이번 과정에서 얻고 싶은 것(Hopes)과
        걱정되는 것(Fears)을 코치와 대화로 맞추는 단계예요.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onContinue}
        className={`${stageCoachBtnPrimary} inline-flex w-full items-center justify-center gap-1.5`}
      >
        다음으로 진행하기
        <IconArrowRight className="size-4" stroke={2} aria-hidden />
      </button>
    </div>
  );
}
