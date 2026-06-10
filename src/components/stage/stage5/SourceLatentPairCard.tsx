"use client";

import { IconChevronDown, IconChevronUp, IconPlus } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
import { POSTIT_SHELL_WIDTH } from "@/lib/stages/stage4/postitLayout";
import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import type { SourceLatentPair } from "@/lib/stages/stage5/groupSourceLatentPairs";
import type {
  Stage5BoardPostit,
  Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";

interface SourceLatentPairCardProps {
  pair: SourceLatentPair;
  subject: Stage5SubjectRef;
  subjectIndex: number;
  onUpdateLatent: (id: string, text: string) => void;
  onRemoveLatent: (id: string) => void;
  onAddLatent: (sourceId: string) => void;
}

function PostitPaper({
  kind,
  subject,
  subjectIndex,
  children,
}: {
  kind: Stage5BoardPostit["kind"];
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
        />
      </div>
      {children}
    </div>
  );
}

function LatentPostitBody({
  postit,
  subject,
  subjectIndex,
  onUpdate,
  onRemove,
}: {
  postit: Stage5BoardPostit;
  subject: Stage5SubjectRef;
  subjectIndex: number;
  onUpdate: (text: string) => void;
  onRemove: () => void;
}) {
  return (
    <PostitPaper kind="latent_need" subject={subject} subjectIndex={subjectIndex}>
      <button
        type="button"
        aria-label="삭제"
        onClick={onRemove}
        className="synthesis-postit-remove absolute top-[13px] right-[13px] z-[2]"
      >
        <span className="empathy-postit-remove-x">×</span>
      </button>
      <SynthesisPostitTextarea
        value={postit.text}
        onChange={onUpdate}
        placeholder="잠재 니즈를 적어 보세요"
        autoFit={false}
        className="pb-8"
      />
      {postit.kevinGenerated ? (
        <span className="synthesis-postit-caption absolute bottom-2.5 left-2 pr-9 text-[11px] font-medium">
          Kevin 초안
        </span>
      ) : null}
    </PostitPaper>
  );
}

const SOURCE_KIND_LABEL = {
  quote: "언급한 것",
  observation: "관찰한 것",
  finding: "발견한 것",
} as const;

function latentPreviewSnippet(latents: Stage5BoardPostit[]): string {
  const first = latents.find((l) => l.text.trim());
  return first?.text.trim() ?? "";
}

export function SourceLatentPairCard({
  pair,
  subject,
  subjectIndex,
  onUpdateLatent,
  onRemoveLatent,
  onAddLatent,
}: SourceLatentPairCardProps) {
  const [expanded, setExpanded] = useState(false);
  const latentCount = pair.latents.length;
  const previewText = latentPreviewSnippet(pair.latents);
  const sourceLabel = isStage5SourcePostitKind(pair.source.kind)
    ? SOURCE_KIND_LABEL[pair.source.kind]
    : "조사 내용";

  return (
    <div className={`${POSTIT_SHELL_WIDTH} shrink-0 source-latent-pair`}>
      <div className="source-latent-pair__frame flex flex-col gap-2">
        <span className="source-latent-pair__kind latent-needs-board__kind-label text-[11px] font-semibold">
          {sourceLabel}
        </span>

        <div className="source-latent-pair__paper-slot aspect-square w-full">
          <PostitPaper
            kind={pair.source.kind}
            subject={subject}
            subjectIndex={subjectIndex}
          >
            <p className="synthesis-postit-text break-keep pb-8">
              {pair.source.text || "—"}
            </p>
          </PostitPaper>
        </div>

        {!expanded ? (
          <div className="flex flex-col gap-1.5">
            {latentCount > 0 ? (
              <button
                type="button"
                className="source-latent-pair__preview"
                onClick={() => setExpanded(true)}
                aria-expanded={false}
                aria-label="잠재 니즈 펼치기"
              >
                <span className="source-latent-pair__preview-badge">잠재 니즈</span>
                <span className="source-latent-pair__preview-text truncate">
                  {previewText}
                </span>
                {latentCount > 1 ? (
                  <span className="source-latent-pair__preview-more shrink-0">
                    +{latentCount - 1}
                  </span>
                ) : null}
                <IconChevronDown
                  className="source-latent-pair__preview-icon size-3.5 shrink-0"
                  stroke={2.5}
                  aria-hidden
                />
              </button>
            ) : (
              <button
                type="button"
                className="source-latent-pair__toggle source-latent-pair__toggle--add"
                onClick={() => onAddLatent(pair.source.id)}
              >
                <IconPlus className="size-3.5 shrink-0" stroke={2.5} />
                잠재 니즈 추가
              </button>
            )}
          </div>
        ) : (
          <div className="source-latent-pair__latents flex flex-col gap-3">
            {pair.latents.map((latent) => (
              <div
                key={latent.id}
                className="source-latent-pair__paper-slot aspect-square w-full"
              >
                <LatentPostitBody
                  postit={latent}
                  subject={subject}
                  subjectIndex={subjectIndex}
                  onUpdate={(text) => onUpdateLatent(latent.id, text)}
                  onRemove={() => onRemoveLatent(latent.id)}
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="source-latent-pair__toggle source-latent-pair__toggle--add"
                onClick={() => onAddLatent(pair.source.id)}
              >
                <IconPlus className="size-3.5 shrink-0" stroke={2.5} />
                잠재 니즈 추가
              </button>
              <button
                type="button"
                className="source-latent-pair__toggle"
                onClick={() => setExpanded(false)}
                aria-expanded
              >
                <IconChevronUp className="size-3.5 shrink-0" stroke={2.5} />
                접기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
