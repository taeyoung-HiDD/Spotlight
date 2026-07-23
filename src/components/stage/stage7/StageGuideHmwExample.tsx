"use client";

import { HmwQuestionSquareField } from "@/components/stage/stage7/HmwQuestionSquareField";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { POSTIT_SHELL_WIDTH_HMW_PAIR } from "@/lib/stages/stage4/postitLayout";
import type { StageGuideVisualExample } from "@/lib/stages/stageActivityGuides";
import { stageCaption } from "@/lib/stages/ui";

interface StageGuideHmwExampleProps {
  visual: Extract<StageGuideVisualExample, { type: "hmw_board" }>;
}

export function StageGuideHmwExample({ visual }: StageGuideHmwExampleProps) {
  const subject = {
    id: "guide-hmw-subject",
    name: visual.subjectName,
    context: "",
    thumbnailUrl: "",
  };

  return (
    <div className="hmw-board rounded-2xl border border-border-warm/70 bg-cream/40 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 sm:items-start">
        <div className={POSTIT_SHELL_WIDTH_HMW_PAIR}>
          <p className={`mb-2 ${stageCaption}`}>잠재 니즈 - 1</p>
          <div className="source-latent-pair__paper-slot aspect-square w-full">
            <div className="source-latent-pair__paper synthesis-postit-paper synthesis-postit-paper--latent_need relative">
              <div className="absolute bottom-[13px] right-[13px] z-[1]">
                <SubjectInitialBadge subject={subject} subjectIndex={0} size="sm" />
              </div>
              <p className="synthesis-postit-text whitespace-pre-wrap break-keep">
                {visual.latentNeedText}
              </p>
            </div>
          </div>
        </div>

        <HmwQuestionSquareField value={visual.hmwText} readOnly pairIndex={1} />
      </div>
    </div>
  );
}
