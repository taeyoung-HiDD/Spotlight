"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { LatentNeedsCategorizationBoard } from "@/components/stage/stage5/LatentNeedsCategorizationBoard";
import { LatentNeedsJourneyBoard } from "@/components/stage/stage5/LatentNeedsJourneyBoard";
import { TermChip } from "@/components/stage/TermChip";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { setNeedsWorkflowPhase } from "@/lib/stages/stage5/latentNeedsGroups";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import type { UserJourneyMapData } from "@/lib/stages/stage6/userJourneyTypes";
import {
  stageBtnSecondary,
  stageCaption,
  stagePanel,
} from "@/lib/stages/ui";

interface LatentNeedsWorkPanelProps {
  projectId: string;
  journey: UserJourneyMapData;
  onJourneyChange: (journey: UserJourneyMapData) => void;
  data: Stage5LatentNeedsData;
  onChange: (data: Stage5LatentNeedsData) => void;
  onGenerate: () => void;
  generating: boolean;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

const PHASES = [
  {
    id: "needs_analysis" as const,
    label: "니즈 분석하기",
    hint: "여정에 잠재 니즈 배치",
  },
  {
    id: "needs_categorization" as const,
    label: "니즈 분류하기",
    hint: "Needs Categorization",
  },
];

export function LatentNeedsWorkPanel({
  projectId,
  journey,
  onJourneyChange,
  data,
  onChange,
  onGenerate,
  generating,
  saving,
  saveError,
  lastSavedAt,
}: LatentNeedsWorkPanelProps) {
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(6, locale);
  const phase = data.workflowPhase ?? "needs_analysis";
  const isCategorization = phase === "needs_categorization";

  return (
    <section className={stagePanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {PHASES.map((item) => {
            const selected = phase === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() =>
                  onChange(setNeedsWorkflowPhase(data, item.id, journey))
                }
                className={[
                  "rounded-md border px-3 py-1.5 text-left transition-colors break-keep",
                  selected
                    ? "border-spotlight bg-spotlight text-on-spotlight"
                    : "border-border-warm bg-cream text-foreground hover:bg-surface",
                ].join(" ")}
              >
                <span className="block text-[14px] font-semibold">
                  {item.label}
                </span>
                <span
                  className={[
                    "mt-0.5 block text-[11px]",
                    selected ? "text-on-spotlight/80" : "text-muted",
                  ].join(" ")}
                >
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
        <TermChip
          label="용어"
          definition={
            isCategorization
              ? "비슷한 잠재 니즈를 묶은 그룹 — 이름과 구성은 가설이며 검증이 필요해요."
              : "여정 단계 아래 잠재 니즈 — 아직 검증이 필요한 진짜 필요 가설이에요."
          }
        />
      </div>

      <p className={`mb-4 ${stageCaption}`}>
        {isCategorization
          ? "도출한 잠재 니즈를 비슷한 것끼리 묶어 분류해 보세요. 그룹 이름·구성은 언제든 바꿀 수 있어요."
          : purposeCopy.purpose}
      </p>

      {isCategorization ? (
        <LatentNeedsCategorizationBoard
          projectId={projectId}
          data={data}
          onChange={onChange}
        />
      ) : (
        <LatentNeedsJourneyBoard
          projectId={projectId}
          journey={journey}
          onJourneySubjectChange={onJourneyChange}
          needs={data}
          onNeedsChange={onChange}
          onGenerate={onGenerate}
          generating={generating}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-warm/60 pt-3">
        <p className={stageCaption}>
          {saveError
            ? saveError
            : saving
              ? "저장 중…"
              : lastSavedAt
                ? `마지막 저장 ${lastSavedAt}`
                : "자동 저장됩니다."}
        </p>
        {!isCategorization ? (
          <button
            type="button"
            onClick={() =>
              onChange(
                setNeedsWorkflowPhase(data, "needs_categorization", journey),
              )
            }
            className={stageBtnSecondary}
          >
            니즈 분류하기로
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              onChange(setNeedsWorkflowPhase(data, "needs_analysis", journey))
            }
            className={stageBtnSecondary}
          >
            니즈 분석하기로
          </button>
        )}
      </div>
    </section>
  );
}
