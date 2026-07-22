"use client";

import { IconChevronDown, IconChevronUp, IconPlus } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
import { POSTIT_SHELL_WIDTH_STAGE5 } from "@/lib/stages/stage4/postitLayout";
import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import type { SourceLatentPair } from "@/lib/stages/stage5/groupSourceLatentPairs";
import type {
  Stage5BoardPostit,
  Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { useArchiveView } from "@/lib/archive/archiveViewContext";
import { useUiLocale } from "@/hooks/useUiLocale";

interface SourceLatentPairCardProps {
  pair: SourceLatentPair;
  subject: Stage5SubjectRef;
  subjectIndex: number;
  onUpdateSource: (id: string, text: string) => void;
  onRemoveSource: (id: string) => void;
  onUpdateLatent: (id: string, text: string) => void;
  onRemoveLatent: (id: string) => void;
  onAddLatent: (sourceId: string) => void;
}

const SOURCE_PLACEHOLDER = {
  quote: { ko: "언급한 내용을 적어 보세요", en: "Write what they said" },
  observation: {
    ko: "관찰한 내용을 적어 보세요",
    en: "Write what you observed",
  },
  finding: { ko: "발견한 내용을 적어 보세요", en: "Write what you found" },
} as const;

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

export function LatentNeedPostitCard({
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
  const locale = useUiLocale();
  return (
    <div className={`${POSTIT_SHELL_WIDTH_STAGE5} shrink-0 source-latent-pair`}>
      <span className="source-latent-pair__kind latent-needs-board__kind-label text-[11px] font-semibold">
        {locale === "en" ? "Latent need" : "잠재 니즈"}
      </span>
      <div className="source-latent-pair__paper-slot mt-2 aspect-square w-full">
        <LatentPostitBody
          postit={postit}
          subject={subject}
          subjectIndex={subjectIndex}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

function EditablePostitBody({
  postit,
  subject,
  subjectIndex,
  onUpdate,
  onRemove,
  placeholder,
}: {
  postit: Stage5BoardPostit;
  subject: Stage5SubjectRef;
  subjectIndex: number;
  onUpdate: (text: string) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  const archiveView = useArchiveView();
  const locale = useUiLocale();

  return (
    <PostitPaper kind={postit.kind} subject={subject} subjectIndex={subjectIndex}>
      {!archiveView ? (
        <button
          type="button"
          aria-label={locale === "en" ? "Delete" : "삭제"}
          onClick={onRemove}
          className="synthesis-postit-remove absolute top-[13px] right-[13px] z-[2]"
        >
          <span className="empathy-postit-remove-x">×</span>
        </button>
      ) : null}
      {archiveView ? (
        <p className="synthesis-postit-text break-keep">
          <LocalizedText>{postit.text || "—"}</LocalizedText>
        </p>
      ) : (
        <SynthesisPostitTextarea
          value={postit.text}
          onChange={onUpdate}
          placeholder={placeholder}
          autoFit={false}
        />
      )}
      {postit.kevinGenerated ? (
        <span className="synthesis-postit-caption absolute bottom-2.5 left-2 pr-9 text-[11px] font-medium">
          {locale === "en" ? "Kevin draft" : "Kevin 초안"}
        </span>
      ) : null}
    </PostitPaper>
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
  const locale = useUiLocale();
  return (
    <EditablePostitBody
      postit={postit}
      subject={subject}
      subjectIndex={subjectIndex}
      onUpdate={onUpdate}
      onRemove={onRemove}
      placeholder={
        locale === "en" ? "Write a latent need" : "잠재 니즈를 적어 보세요"
      }
    />
  );
}

const SOURCE_KIND_LABEL = {
  quote: { ko: "언급한 것", en: "Quoted" },
  observation: { ko: "관찰한 것", en: "Observed" },
  finding: { ko: "발견한 것", en: "Finding" },
} as const;

function latentPreviewSnippet(latents: Stage5BoardPostit[]): string {
  const first = latents.find((l) => l.text.trim());
  return first?.text.trim() ?? "";
}

export function SourceLatentPairCard({
  pair,
  subject,
  subjectIndex,
  onUpdateSource,
  onRemoveSource,
  onUpdateLatent,
  onRemoveLatent,
  onAddLatent,
}: SourceLatentPairCardProps) {
  const [expanded, setExpanded] = useState(false);
  const locale = useUiLocale();
  const archiveView = useArchiveView();
  const latentCount = pair.latents.length;
  const previewText = latentPreviewSnippet(pair.latents);
  const sourceLabel = isStage5SourcePostitKind(pair.source.kind)
    ? SOURCE_KIND_LABEL[pair.source.kind][locale]
    : locale === "en"
      ? "Research note"
      : "조사 내용";
  const sourcePlaceholder = isStage5SourcePostitKind(pair.source.kind)
    ? SOURCE_PLACEHOLDER[pair.source.kind][locale]
    : locale === "en"
      ? "Write a research note"
      : "조사 내용을 적어 보세요";

  return (
    <div className={`${POSTIT_SHELL_WIDTH_STAGE5} shrink-0 source-latent-pair`}>
      <div className="source-latent-pair__frame flex flex-col gap-2">
        <span className="source-latent-pair__kind latent-needs-board__kind-label text-[11px] font-semibold">
          {sourceLabel}
        </span>

        <div className="source-latent-pair__paper-slot aspect-square w-full">
          <EditablePostitBody
            postit={pair.source}
            subject={subject}
            subjectIndex={subjectIndex}
            onUpdate={(text) => onUpdateSource(pair.source.id, text)}
            onRemove={() => onRemoveSource(pair.source.id)}
            placeholder={sourcePlaceholder}
          />
        </div>

        {!expanded ? (
          <div className="flex flex-col gap-1.5">
            {latentCount > 0 ? (
              <button
                type="button"
                className="source-latent-pair__preview"
                onClick={() => setExpanded(true)}
                aria-expanded={false}
                aria-label={
                  locale === "en" ? "Expand latent needs" : "잠재 니즈 펼치기"
                }
              >
                <span className="source-latent-pair__preview-badge">
                  {locale === "en" ? "Latent need" : "잠재 니즈"}
                </span>
                <span className="source-latent-pair__preview-text truncate">
                  <LocalizedText>{previewText}</LocalizedText>
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
            ) : !archiveView ? (
              <button
                type="button"
                className="source-latent-pair__toggle source-latent-pair__toggle--add"
                onClick={() => onAddLatent(pair.source.id)}
              >
                <IconPlus className="size-3.5 shrink-0" stroke={2.5} />
                {locale === "en" ? "Add latent need" : "잠재 니즈 추가"}
              </button>
            ) : null}
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
              {!archiveView ? (
                <button
                  type="button"
                  className="source-latent-pair__toggle source-latent-pair__toggle--add"
                  onClick={() => onAddLatent(pair.source.id)}
                >
                  <IconPlus className="size-3.5 shrink-0" stroke={2.5} />
                  {locale === "en" ? "Add latent need" : "잠재 니즈 추가"}
                </button>
              ) : null}
              <button
                type="button"
                className="source-latent-pair__toggle"
                onClick={() => setExpanded(false)}
                aria-expanded
              >
                <IconChevronUp className="size-3.5 shrink-0" stroke={2.5} />
                {locale === "en" ? "Collapse" : "접기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
