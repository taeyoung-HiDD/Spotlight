"use client";

import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  LatentNeedPostitCard,
  SourceLatentPairCard,
} from "@/components/stage/stage5/SourceLatentPairCard";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { useArchiveView } from "@/lib/archive/archiveViewContext";
import { postitSortKey } from "@/lib/stages/stage4/postitLayout";
import { buildSourceLatentPairs } from "@/lib/stages/stage5/groupSourceLatentPairs";
import {
  createStage5BoardPostit,
  type Stage5BoardPostitKind,
  type Stage5LatentNeedsData,
  type Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";
import {
  formatConductedAtLabel,
  researchMethodLabel,
} from "@/lib/stages/stage4/researchSynthesisSubject";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import {
  stageBtnPrimary,
  stageCaption,
  stageLabel,
} from "@/lib/stages/ui";
import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";

type SubjectFilter = "all" | string;
/** 조사 결과 탭 — 한 종류씩만 보여 스크롤을 줄입니다 */
type KindTab = Stage5BoardPostitKind;

const KIND_TABS: KindTab[] = [
  "quote",
  "observation",
  "finding",
  "latent_need",
];

const KIND_META: Record<
  KindTab,
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
  onGenerate?: () => void;
  generating?: boolean;
}

function subjectIndexMap(subjects: Stage5LatentNeedsData["subjects"]) {
  return new Map(subjects.map((s, i) => [s.id, i]));
}

function countForKind(
  pairs: ReturnType<typeof buildSourceLatentPairs>,
  postits: Stage5LatentNeedsData["postits"],
  kind: KindTab,
  subjectFilter: SubjectFilter,
): number {
  if (kind === "latent_need") {
    return postits.filter(
      (p) =>
        p.kind === "latent_need" &&
        (subjectFilter === "all" || p.subjectId === subjectFilter),
    ).length;
  }
  return pairs.filter(
    (pair) =>
      pair.source.kind === kind &&
      (subjectFilter === "all" || pair.subjectId === subjectFilter),
  ).length;
}

export function LatentNeedsBoard({
  data,
  onChange,
  onGenerate,
  generating = false,
}: LatentNeedsBoardProps) {
  const archiveView = useArchiveView();
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const [kindTab, setKindTab] = useState<KindTab>("quote");
  const indexBySubject = subjectIndexMap(data.subjects);
  const pairs = useMemo(() => buildSourceLatentPairs(data), [data]);

  const sourceNoteCount = useMemo(
    () =>
      data.postits.filter(
        (p) => isStage5SourcePostitKind(p.kind) && p.text.trim(),
      ).length,
    [data.postits],
  );

  const subjectFilteredPairs = useMemo(() => {
    if (subjectFilter === "all") return pairs;
    return pairs.filter((pair) => pair.subjectId === subjectFilter);
  }, [pairs, subjectFilter]);

  const filteredPairs = useMemo(() => {
    if (kindTab === "latent_need") return [];
    return subjectFilteredPairs.filter((pair) => pair.source.kind === kindTab);
  }, [subjectFilteredPairs, kindTab]);

  const filteredLatents = useMemo(() => {
    if (kindTab !== "latent_need") return [];
    let latents = data.postits.filter((p) => p.kind === "latent_need");
    if (subjectFilter !== "all") {
      latents = latents.filter((p) => p.subjectId === subjectFilter);
    }
    return [...latents].sort(
      (a, b) => postitSortKey(a.id) - postitSortKey(b.id),
    );
  }, [data.postits, kindTab, subjectFilter]);

  const kindCounts = useMemo(() => {
    const counts = {} as Record<KindTab, number>;
    for (const kind of KIND_TABS) {
      counts[kind] = countForKind(pairs, data.postits, kind, subjectFilter);
    }
    return counts;
  }, [pairs, data.postits, subjectFilter]);

  useEffect(() => {
    if (
      subjectFilter !== "all" &&
      !data.subjects.some((subject) => subject.id === subjectFilter)
    ) {
      setSubjectFilter("all");
    }
  }, [data.subjects, subjectFilter]);

  /** 조사 대상 필터가 바뀌었을 때만 — 비어 있는 탭이면 내용 있는 첫 탭으로 */
  useEffect(() => {
    if (kindCounts[kindTab] > 0) return;
    const next = KIND_TABS.find((kind) => kindCounts[kind] > 0);
    if (next) setKindTab(next);
    // kindTab은 의도적으로 의존성에서 제외 — 사용자가 빈 탭을 고른 뒤 추가할 수 있게
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subjectFilter 변경 시에만
  }, [subjectFilter, kindCounts]);

  const resolveSubjectForAdd = (): {
    subjects: Stage5SubjectRef[];
    subjectId: string;
  } => {
    if (subjectFilter !== "all") {
      return { subjects: data.subjects, subjectId: subjectFilter };
    }
    if (data.subjects.length > 0) {
      return {
        subjects: data.subjects,
        subjectId: data.subjects[0]!.id,
      };
    }
    const manual: Stage5SubjectRef = {
      id: "manual-subject",
      name: "직접 입력",
      context: "",
      thumbnailUrl: "",
      researchMethodId: "",
    };
    return { subjects: [manual], subjectId: manual.id };
  };

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

  /** 조사 포스트잇 삭제 — 이 소스만 가리키던 잠재 니즈도 함께 제거 */
  const removeSourcePostit = (id: string) => {
    onChange({
      ...data,
      postits: data.postits
        .filter((p) => {
          if (p.id === id) return false;
          if (p.kind !== "latent_need") return true;
          const links = p.linkedSourceIds ?? [];
          if (links.length === 1 && links[0] === id) return false;
          return true;
        })
        .map((p) => {
          if (p.kind !== "latent_need" || !p.linkedSourceIds?.includes(id)) {
            return p;
          }
          return {
            ...p,
            linkedSourceIds: p.linkedSourceIds.filter((lid) => lid !== id),
          };
        }),
    });
  };

  const addSourcePostit = (kind: Stage5BoardPostitKind) => {
    const { subjects, subjectId } = resolveSubjectForAdd();
    onChange({
      ...data,
      subjects,
      postits: [
        ...data.postits,
        createStage5BoardPostit(subjectId, kind, {
          readonly: false,
          kevinGenerated: false,
        }),
      ],
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

  const showKindEmpty =
    hasContent &&
    !generating &&
    kindTab === "latent_need" &&
    filteredLatents.length === 0;

  const showSourceKindEmpty =
    hasContent &&
    !generating &&
    kindTab !== "latent_need" &&
    filteredPairs.length === 0;

  const addButtonLabel =
    kindTab === "latent_need"
      ? "잠재 니즈 추가"
      : `${KIND_META[kindTab].label} 추가`;

  return (
    <div className="latent-needs-board space-y-4">
      <div
        className="rounded-lg border border-border-warm/70 bg-cream/30 px-3 py-2.5"
        role="tablist"
        aria-label="조사 결과 탭"
      >
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className={stageLabel}>조사 결과</p>
          {!archiveView && onGenerate ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating || sourceNoteCount === 0}
              className={stageBtnPrimary}
            >
              {generating
                ? "Kevin이 잠재 니즈 도출 중…"
                : "AI로 잠재 니즈 도출하기"}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {KIND_TABS.map((kind) => {
            const meta = KIND_META[kind];
            const selected = kindTab === kind;
            const count = kindCounts[kind];
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setKindTab(kind)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[15px] font-semibold transition-colors break-keep",
                  selected
                    ? "border-spotlight bg-spotlight text-on-spotlight"
                    : meta.legendClass,
                ].join(" ")}
              >
                <span>{meta.label}</span>
                <span
                  className={[
                    "rounded px-1 py-px text-[12px] font-medium tabular-nums",
                    selected
                      ? "bg-on-spotlight/15 text-on-spotlight"
                      : "bg-panel/80 text-muted",
                  ].join(" ")}
                >
                  {count}
                </span>
                {!selected ? (
                  <span className="latent-needs-board__legend-muted text-[13px] font-medium">
                    · {meta.colorHint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className={`mt-2 ${stageCaption}`}>
          탭을 눌러 언급·관찰·발견·잠재 니즈를 나눠 보세요. 「AI로 잠재 니즈
          도출하기」를 누르면 각 조사 포스트잇 아래에 잠재 니즈 초안이
          붙어요. 직접 추가·수정·삭제도 할 수 있어요.
        </p>
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
                ? researchMethodLabel(
                    subject.researchMethodId as ResearchMethodId,
                  )
                : "";
              const conductedLabel = subject.conductedAt
                ? formatConductedAtLabel(subject.conductedAt)
                : "";
              const meta = [methodLabel, conductedLabel]
                .filter(
                  (part) =>
                    part && part !== "방법 미정" && part !== "일시 미정",
                )
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

      <div
        className="flex flex-wrap items-start gap-4"
        role="tabpanel"
        aria-label={KIND_META[kindTab].label}
      >
        {!hasContent && !generating ? (
          <p
            className={`w-full rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-8 text-center ${stageCaption}`}
          >
            4단계 발견 정리하기에서 조사 대상·언급·관찰·발견이 있으면 여기 한
            보드에 모여요.
            <br />
            아래에서 직접 추가하거나, Kevin이 잠재 니즈 초안을 채워 드릴 수
            있어요.
          </p>
        ) : null}

        {showKindEmpty ? (
          <p
            className={`w-full rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-8 text-center ${stageCaption}`}
          >
            {subjectFilter !== "all"
              ? "선택한 조사 대상의 잠재 니즈가 아직 없어요."
              : "잠재 니즈가 아직 없어요."}
            <br />
            「잠재 니즈 추가」로 직접 적거나, 언급·관찰 탭에서 포스트잇 아래
            미리보기로 추가해 보세요.
          </p>
        ) : null}

        {showSourceKindEmpty ? (
          <p
            className={`w-full rounded-md border border-dashed border-border-warm bg-cream/40 px-3 py-8 text-center ${stageCaption}`}
          >
            {subjectFilter !== "all"
              ? `선택한 조사 대상의 ${KIND_META[kindTab].label}이 아직 없어요.`
              : `${KIND_META[kindTab].label}이 아직 없어요.`}
            <br />
            「{KIND_META[kindTab].label} 추가」로 직접 적거나, 다른 탭·4단계
            내용을 확인해 보세요.
          </p>
        ) : null}

        {kindTab === "latent_need"
          ? filteredLatents.map((latent) => {
              const subjectIdx = indexBySubject.get(latent.subjectId) ?? 0;
              const subject =
                data.subjects.find((s) => s.id === latent.subjectId) ?? {
                  id: latent.subjectId,
                  name: "",
                  context: "",
                  thumbnailUrl: "",
                };

              return (
                <LatentNeedPostitCard
                  key={latent.id}
                  postit={latent}
                  subject={subject}
                  subjectIndex={subjectIdx}
                  onUpdate={(text) => updatePostit(latent.id, text)}
                  onRemove={() => removePostit(latent.id)}
                />
              );
            })
          : null}

        {kindTab !== "latent_need"
          ? filteredPairs.map((pair) => {
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
                  onUpdateSource={updatePostit}
                  onRemoveSource={removeSourcePostit}
                  onUpdateLatent={updatePostit}
                  onRemoveLatent={removePostit}
                  onAddLatent={addLatentForSource}
                />
              );
            })
          : null}

        {!archiveView && !generating ? (
          <button
            type="button"
            onClick={() => addSourcePostit(kindTab)}
            aria-label={addButtonLabel}
            className="inline-flex h-[10.125rem] w-[clamp(7.8rem,100%,10.125rem)] shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-warm bg-cream/40 text-[14px] font-semibold text-foreground transition-colors hover:border-spotlight hover:bg-highlight"
          >
            <IconPlus className="size-5" stroke={2} aria-hidden />
            {addButtonLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
