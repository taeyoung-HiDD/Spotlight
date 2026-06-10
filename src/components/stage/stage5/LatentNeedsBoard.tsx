"use client";

import { useEffect, useMemo, useState } from "react";
import { SourceLatentPairCard } from "@/components/stage/stage5/SourceLatentPairCard";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { buildSourceLatentPairs } from "@/lib/stages/stage5/groupSourceLatentPairs";
import {
  createStage5BoardPostit,
  type Stage5BoardPostitKind,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import {
  formatConductedAtLabel,
  researchMethodLabel,
} from "@/lib/stages/stage4/researchSynthesisSubject";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import { stageCaption, stageLabel } from "@/lib/stages/ui";

type SubjectFilter = "all" | string;

const KIND_META: Record<
  Stage5BoardPostitKind,
  { label: string; legendClass: string; colorHint: string }
> = {
  quote: {
    label: "언급한 것",
    legendClass: "latent-needs-board__legend latent-needs-board__legend--quote",
    colorHint: "노랑",
  },
  observation: {
    label: "관찰한 것",
    legendClass:
      "latent-needs-board__legend latent-needs-board__legend--observation",
    colorHint: "연황",
  },
  finding: {
    label: "발견한 것",
    legendClass:
      "latent-needs-board__legend latent-needs-board__legend--finding",
    colorHint: "파랑",
  },
  latent_need: {
    label: "잠재 니즈",
    legendClass:
      "latent-needs-board__legend latent-needs-board__legend--latent",
    colorHint: "보라",
  },
};

interface LatentNeedsBoardProps {
  data: Stage5LatentNeedsData;
  onChange: (data: Stage5LatentNeedsData) => void;
  generating?: boolean;
}

function subjectIndexMap(subjects: Stage5LatentNeedsData["subjects"]) {
  return new Map(subjects.map((s, i) => [s.id, i]));
}

export function LatentNeedsBoard({
  data,
  onChange,
  generating = false,
}: LatentNeedsBoardProps) {
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const indexBySubject = subjectIndexMap(data.subjects);
  const pairs = useMemo(() => buildSourceLatentPairs(data), [data]);
  const filteredPairs = useMemo(() => {
    if (subjectFilter === "all") return pairs;
    return pairs.filter((pair) => pair.subjectId === subjectFilter);
  }, [pairs, subjectFilter]);

  useEffect(() => {
    if (
      subjectFilter !== "all" &&
      !data.subjects.some((subject) => subject.id === subjectFilter)
    ) {
      setSubjectFilter("all");
    }
  }, [data.subjects, subjectFilter]);

  const updatePostit = (id: string, text: string) => {
    onChange({
      ...data,
      postits: data.postits.map((p) =>
        p.id === id ? { ...p, text } : p,
      ),
    });
  };

  const removePostit = (id: string) => {
    onChange({
      ...data,
      postits: data.postits.filter((p) => p.id !== id),
    });
  };

  const addLatentForSource = (sourceId: string) => {
    const source = data.postits.find((p) => p.id === sourceId);
    if (!source) return;
    onChange({
      ...data,
      postits: [
        ...data.postits,
        createStage5BoardPostit(source.subjectId, "latent_need", {
          readonly: false,
          kevinGenerated: false,
          linkedSourceIds: [sourceId],
        }),
      ],
    });
  };

  const hasContent =
    data.postits.some((p) => p.text.trim()) || pairs.length > 0;

  return (
    <div className="latent-needs-board space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(KIND_META) as Stage5BoardPostitKind[]).map((kind) => {
          const meta = KIND_META[kind];
          return (
            <span
              key={kind}
              className={[
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium",
                meta.legendClass,
              ].join(" ")}
            >
              <span className="font-semibold">{meta.label}</span>
              <span className="latent-needs-board__legend-muted">
                · {meta.colorHint}
              </span>
            </span>
          );
        })}
        <span className={stageCaption}>
          · 조사 포스트잇 아래 미리보기를 눌러 잠재 니즈를 펼칠 수 있어요
        </span>
      </div>

      {data.subjects.length > 0 ? (
        <div
          className="rounded-lg border border-border-warm/70 bg-cream/30 px-3 py-2.5"
          role="tablist"
          aria-label="조사 대상 필터"
        >
          <p className={`mb-2.5 ${stageLabel}`}>조사 대상</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              role="tab"
              aria-selected={subjectFilter === "all"}
              onClick={() => setSubjectFilter("all")}
              className={[
                "inline-flex items-center rounded-md border px-3 py-1.5 text-[15px] font-semibold transition-colors break-keep",
                subjectFilter === "all"
                  ? "border-spotlight bg-spotlight text-on-spotlight"
                  : "border-border-warm bg-cream text-foreground hover:bg-surface",
              ].join(" ")}
            >
              전체
            </button>
            {data.subjects.map((subject, idx) => {
              const selected = subjectFilter === subject.id;
              const methodLabel = subject.researchMethodId
                ? researchMethodLabel(subject.researchMethodId as ResearchMethodId)
                : "";
              const conductedLabel = subject.conductedAt
                ? formatConductedAtLabel(subject.conductedAt)
                : "";
              const meta = [methodLabel, conductedLabel]
                .filter((part) => part && part !== "방법 미정" && part !== "일시 미정")
                .join(" · ");
              return (
                <button
                  key={subject.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSubjectFilter(subject.id)}
                  title={
                    [subject.context.trim(), meta].filter(Boolean).join(" — ") ||
                    undefined
                  }
                  className={[
                    "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[15px] font-semibold transition-colors break-keep",
                    selected
                      ? "border-spotlight bg-spotlight text-on-spotlight"
                      : "border-border-warm bg-cream text-foreground hover:bg-surface",
                  ].join(" ")}
                >
                  <SubjectInitialBadge
                    subject={subject}
                    subjectIndex={idx}
                    showTooltip={false}
                  />
                  <span className="inline-flex flex-col items-start gap-0.5 text-left">
                    <span>{subjectDisplayLabel(subject.name, idx)}</span>
                    {meta ? (
                      <span
                        className={[
                          "text-[11px] font-medium leading-tight",
                          selected ? "text-on-spotlight/85" : "text-muted",
                        ].join(" ")}
                      >
                        {meta}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {generating ? (
        <p
          className={`rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-4 text-center ${stageCaption}`}
        >
          Kevin이 조사 내용을 바탕으로 잠재 니즈를 정리하고 있어요…
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        {!hasContent && !generating ? (
          <p
            className={`w-full rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-8 text-center ${stageCaption}`}
          >
            4단계 발견 정리하기에서 조사 대상·언급·관찰·발견이 있으면 여기 한
            보드에 모여요.
            <br />
            Kevin이 잠재 니즈 초안을 함께 채워 드립니다.
          </p>
        ) : null}

        {hasContent &&
        !generating &&
        filteredPairs.length === 0 &&
        subjectFilter !== "all" ? (
          <p
            className={`w-full rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-8 text-center ${stageCaption}`}
          >
            선택한 조사 대상의 언급·관찰이 아직 없어요.
            <br />
            다른 조사 대상을 선택하거나 4단계에서 내용을 추가해 보세요.
          </p>
        ) : null}

        {filteredPairs.map((pair) => {
          const subjectIdx = indexBySubject.get(pair.subjectId) ?? 0;
          const subject =
            data.subjects.find((s) => s.id === pair.subjectId) ?? {
              id: pair.subjectId,
              name: "",
              context: "",
              thumbnailUrl: "",
            };

          return (
            <SourceLatentPairCard
              key={pair.id}
              pair={pair}
              subject={subject}
              subjectIndex={subjectIdx}
              onUpdateLatent={updatePostit}
              onRemoveLatent={removePostit}
              onAddLatent={addLatentForSource}
            />
          );
        })}
      </div>
    </div>
  );
}
