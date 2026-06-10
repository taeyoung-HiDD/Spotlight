"use client";

import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { POSTIT_SHELL_WIDTH } from "@/lib/stages/stage4/postitLayout";
import type {
  StageGuideLatentNeedsPairExample,
  StageGuideVisualExample,
} from "@/lib/stages/stageActivityGuides";
import type {
  Stage5BoardPostitKind,
  Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";

const SOURCE_KIND_LABEL = {
  quote: "언급한 것",
  observation: "관찰한 것",
} as const;

function demoSubject(name: string, index: number): Stage5SubjectRef {
  return {
    id: `guide-subject-${index}`,
    name,
    context: "",
    thumbnailUrl: "",
  };
}

function GuidePostitPaper({
  kind,
  subject,
  subjectIndex,
  children,
}: {
  kind: Stage5BoardPostitKind;
  subject: Stage5SubjectRef;
  subjectIndex: number;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "source-latent-pair__paper synthesis-postit-paper",
        `synthesis-postit-paper--${kind}`,
      ].join(" ")}
    >
      <div className="absolute bottom-[13px] right-[13px] z-[1]">
        <SubjectInitialBadge
          subject={subject}
          subjectIndex={subjectIndex}
          size="sm"
          showTooltip={false}
        />
      </div>
      {children}
    </div>
  );
}

function GuidePairCard({
  pair,
  subjectIndex,
}: {
  pair: StageGuideLatentNeedsPairExample;
  subjectIndex: number;
}) {
  const subject = demoSubject(pair.subjectName, subjectIndex);
  const sourceLabel = SOURCE_KIND_LABEL[pair.sourceKind];

  return (
    <div
      className={`${POSTIT_SHELL_WIDTH} shrink-0 source-latent-pair pointer-events-none select-none`}
      aria-hidden
    >
      <div className="source-latent-pair__frame flex flex-col gap-2">
        <span className="source-latent-pair__kind latent-needs-board__kind-label text-[11px] font-semibold">
          {sourceLabel}
        </span>

        <div className="source-latent-pair__paper-slot aspect-square w-full">
          <GuidePostitPaper
            kind={pair.sourceKind}
            subject={subject}
            subjectIndex={subjectIndex}
          >
            <p className="synthesis-postit-text break-keep pb-8">
              {pair.sourceText}
            </p>
          </GuidePostitPaper>
        </div>

        {pair.expanded ? (
          <div className="source-latent-pair__latents flex flex-col gap-3">
            <div className="source-latent-pair__paper-slot aspect-square w-full">
              <GuidePostitPaper
                kind="latent_need"
                subject={subject}
                subjectIndex={subjectIndex}
              >
                <p className="synthesis-postit-text break-keep pb-8">
                  {pair.latentText}
                </p>
                {pair.kevinGenerated ? (
                  <span className="synthesis-postit-caption absolute bottom-2.5 left-2 pr-9 text-[11px] font-medium">
                    Kevin 초안
                  </span>
                ) : null}
              </GuidePostitPaper>
            </div>
          </div>
        ) : (
          <div
            className="source-latent-pair__preview"
            aria-hidden
          >
            <span className="source-latent-pair__preview-badge">잠재 니즈</span>
            <span className="source-latent-pair__preview-text truncate">
              {pair.latentText}
            </span>
            <IconChevronDown
              className="source-latent-pair__preview-icon size-3.5 shrink-0"
              stroke={2.5}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface StageGuideLatentNeedsExampleProps {
  visual: Extract<StageGuideVisualExample, { type: "latent_needs_board" }>;
}

export function StageGuideLatentNeedsExample({
  visual,
}: StageGuideLatentNeedsExampleProps) {
  return (
    <div className="latent-needs-board rounded-xl border border-border-warm bg-cream/25 px-3 py-4 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          ["quote", "observation", "finding", "latent_need"] as const
        ).map((kind) => {
          const meta =
            kind === "quote"
              ? { label: "언급한 것", class: "latent-needs-board__legend latent-needs-board__legend--quote" }
              : kind === "observation"
                ? {
                    label: "관찰한 것",
                    class:
                      "latent-needs-board__legend latent-needs-board__legend--observation",
                  }
                : kind === "finding"
                  ? {
                      label: "발견한 것",
                      class:
                        "latent-needs-board__legend latent-needs-board__legend--finding",
                    }
                  : {
                      label: "잠재 니즈",
                      class:
                        "latent-needs-board__legend latent-needs-board__legend--latent",
                    };
          return (
            <span
              key={kind}
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[12px] font-medium ${meta.class}`}
            >
              {meta.label}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap items-start justify-center gap-4 sm:justify-start">
        {visual.pairs.map((pair, index) => (
          <GuidePairCard key={`${pair.sourceKind}-${index}`} pair={pair} subjectIndex={index} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="source-latent-pair__toggle source-latent-pair__toggle--add inline-flex w-auto shrink-0 px-3 pointer-events-none select-none">
          <IconPlus className="size-3.5 shrink-0" stroke={2.5} />
          잠재 니즈 추가
        </div>
        <span className="text-[12px] text-muted break-keep">
          직접 보라 포스트잇을 더할 때 보이는 버튼이에요
        </span>
      </div>
    </div>
  );
}
