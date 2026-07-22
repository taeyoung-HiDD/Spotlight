"use client";

import { IconPlus, IconX } from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EmpathyPostitBoard } from "@/components/stage/stage4/EmpathyPostitBoard";
import { PersonaBioFields } from "@/components/stage/stage4/PersonaBioFields";
import {
  PersonaThumbnailEmpty,
  PersonaThumbnailField,
} from "@/components/stage/stage4/PersonaThumbnailField";
import { ResearchSubjectMediaPanel } from "@/components/stage/stage4/ResearchSubjectMediaPanel";
import { VirtualPersonaProfileCard } from "@/components/stage/stage4/VirtualPersonaProfileCard";
import { generatePersonaBio } from "@/lib/stages/fieldResearch/generatePersonaBioClient";
import type { EmpathyQuadrantId } from "@/lib/stages/stage2/empathyMap";
import { normalizePersonaBio } from "@/lib/stages/stage4/personaBio";
import { analyzeResearchMediaToNotes } from "@/lib/stages/stage4/researchMediaToNotesClient";
import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";
import {
  formatConductedAtLabel,
  toDatetimeLocalValue,
  type ResearchSubject,
} from "@/lib/stages/stage4/researchSynthesisSubject";
import {
  createResearchSubject,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import {
  appendQuadrantsToEmpathyMap,
  ensureSubjectEmpathyLinks,
  getLinkedEmpathyMap,
  patchSubjectAndLinkedMap,
  updateLinkedMapQuadrant,
} from "@/lib/stages/stage4/syncSubjectEmpathy";
import {
  applyPersonaBioToMapFields,
  createStage4PersonaMap,
  type Stage4DiscoveriesData,
} from "@/lib/stages/stage4/types";
import { resolvePersonaThumbnailDisplayUrl } from "@/lib/stages/stage4/personaThumbnail";
import {
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
} from "@/lib/stages/ui";

const MAX_SUBJECTS = 12;

function subjectLabel(index: number, name: string): string {
  return name.trim() || `조사 대상 ${index + 1}`;
}

function SubjectThumbnailPreview({
  subject,
  index,
  variant = "card",
}: {
  subject: ResearchSubject;
  index: number;
  variant?: "card" | "tab";
}) {
  const size = variant === "tab" ? "size-6" : "size-11";
  const rounded = variant === "tab" ? "rounded-md" : "rounded-lg";

  return (
    <span
      className={`${size} shrink-0 overflow-hidden border border-border-warm/60 ${rounded}`}
    >
      {subject.thumbnailUrl.trim() ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolvePersonaThumbnailDisplayUrl(
            subject.thumbnailUrl,
            subject.name,
            subject.context,
          )}
          alt=""
          className="size-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              resolvePersonaThumbnailDisplayUrl("", subject.name, subject.context);
          }}
        />
      ) : (
        <PersonaThumbnailEmpty variant="tab" />
      )}
    </span>
  );
}

function empathyItemCount(data: Stage4DiscoveriesData, subjectId: string): number {
  const map = getLinkedEmpathyMap(data, subjectId);
  if (!map) return 0;
  return (["says", "thinks", "does", "feels"] as const).reduce(
    (n, q) => n + map.quadrants[q].filter((i) => i.text.trim()).length,
    0,
  );
}

function empathyDoesCount(
  data: Stage4DiscoveriesData,
  subjectId: string,
): number {
  const map = getLinkedEmpathyMap(data, subjectId);
  if (!map) return 0;
  return map.quadrants.does.filter((i) => i.text.trim()).length;
}

interface Stage4ResearchSynthesisPanelProps {
  projectId: string;
  data: Stage4DiscoveriesData;
  onChange: (next: Stage4DiscoveriesData) => void;
  problem?: string;
  prePmfSummary?: string;
  onActiveSubjectChange?: (subject: {
    id: string;
    name: string;
    index: number;
    hasResearchMedia: boolean;
  }) => void;
}

export function Stage4ResearchSynthesisPanel({
  projectId,
  data,
  onChange,
  problem = "",
  prePmfSummary = "",
  onActiveSubjectChange,
}: Stage4ResearchSynthesisPanelProps) {
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const synthesis = data.researchSynthesis;
  const activeSubject = synthesis.subjects[activeSubjectIndex];
  const activeMap = activeSubject
    ? getLinkedEmpathyMap(data, activeSubject.id)
    : null;

  const activeBio = useMemo(() => {
    if (!activeMap || !activeSubject) return normalizePersonaBio(null);
    return normalizePersonaBio(activeMap.personaBio, {
      name: activeSubject.name || activeMap.personaName,
      context: activeSubject.context || activeMap.personaContext,
    });
  }, [activeMap, activeSubject]);

  useEffect(() => {
    setActiveSubjectIndex((prev) =>
      Math.min(prev, Math.max(0, synthesis.subjects.length - 1)),
    );
  }, [synthesis.subjects.length]);

  useEffect(() => {
    const subject = synthesis.subjects[activeSubjectIndex];
    if (!subject) return;
    onActiveSubjectChange?.({
      id: subject.id,
      name: subjectLabel(activeSubjectIndex, subject.name),
      index: activeSubjectIndex,
      hasResearchMedia: subject.mediaFiles.length > 0,
    });
  }, [
    activeSubjectIndex,
    onActiveSubjectChange,
    synthesis.subjects,
  ]);

  const commit = useCallback(
    (next: Stage4DiscoveriesData) => {
      const linked = ensureSubjectEmpathyLinks(next);
      dataRef.current = linked;
      onChange(linked);
    },
    [onChange],
  );

  const [analyzingSubjectId, setAnalyzingSubjectId] = useState<string | null>(
    null,
  );
  const [analyzeFocus, setAnalyzeFocus] = useState<"video-does" | "all" | null>(
    null,
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeNotice, setAnalyzeNotice] = useState<string | null>(null);
  const [bioGenerating, setBioGenerating] = useState(false);

  useEffect(() => {
    setAnalyzeError(null);
    setAnalyzeNotice(null);
  }, [activeSubject?.id]);

  const updateSubjectField = useCallback(
    (
      index: number,
      field: keyof ResearchSubject,
      value: string | ResearchMediaFile[],
    ) => {
      const current = dataRef.current;
      const subject = current.researchSynthesis.subjects[index];
      if (!subject) return;

      if (field === "name" || field === "context" || field === "thumbnailUrl") {
        commit(
          patchSubjectAndLinkedMap(current, subject.id, {
            [field]: value as string,
          }),
        );
        return;
      }

      const subjects = current.researchSynthesis.subjects.map((s, i) =>
        i === index ? { ...s, [field]: value } : s,
      );
      commit({
        ...current,
        researchSynthesis: { ...current.researchSynthesis, subjects },
      });
    },
    [commit],
  );

  const updateSubjectMedia = useCallback(
    (index: number, mediaFiles: ResearchMediaFile[]) => {
      updateSubjectField(index, "mediaFiles", mediaFiles);
    },
    [updateSubjectField],
  );

  const analyzeSubjectMedia = useCallback(
    async (
      subjectId: string,
      options?: {
        mediaIds?: string[];
        /** onChange 반영 전에도 분석할 수 있도록 방금 업로드한 파일 */
        extraMedia?: ResearchMediaFile[];
        preferDoesNotice?: boolean;
      },
    ) => {
      const current = dataRef.current;
      const subject = current.researchSynthesis.subjects.find(
        (s) => s.id === subjectId,
      );
      if (!subject) return;
      const idFilter = options?.mediaIds?.length
        ? new Set(options.mediaIds)
        : null;
      const mediaPool = [
        ...subject.mediaFiles,
        ...(options?.extraMedia ?? []).filter(
          (m) => !subject.mediaFiles.some((existing) => existing.id === m.id),
        ),
      ];
      const targets = mediaPool.filter(
        (m) =>
          (m.kind === "video" || m.kind === "audio") &&
          m.storagePath?.trim() &&
          (!idFilter || idFilter.has(m.id)),
      );
      if (targets.length === 0) {
        if (!options?.mediaIds) {
          setAnalyzeError("분석할 영상·음성 자료가 없어요.");
        }
        return;
      }

      const videoOnly =
        options?.preferDoesNotice === true ||
        targets.every((m) => m.kind === "video");

      setAnalyzingSubjectId(subjectId);
      setAnalyzeFocus(videoOnly ? "video-does" : "all");
      setAnalyzeError(null);
      setAnalyzeNotice(null);

      let addedCount = 0;
      let addedDoes = 0;
      let failedCount = 0;
      let working = dataRef.current;

      for (const media of targets) {
        try {
          const result = await analyzeResearchMediaToNotes({
            projectId,
            subjectId,
            media: media as ResearchMediaFile & { kind: "video" | "audio" },
          });
          const map = getLinkedEmpathyMap(working, subjectId);
          if (!map) continue;
          const before = empathyItemCount(working, subjectId);
          const beforeDoes = empathyDoesCount(working, subjectId);
          const nextMap = appendQuadrantsToEmpathyMap(map, media.id, {
            says: result.says,
            thinks: result.thinks,
            does: result.does,
            feels: result.feels,
          });
          working = ensureSubjectEmpathyLinks({
            ...working,
            empathyMaps: working.empathyMaps.map((m) =>
              m.id === map.id ? nextMap : m,
            ),
          });
          addedCount += Math.max(
            0,
            empathyItemCount(working, subjectId) - before,
          );
          addedDoes += Math.max(
            0,
            empathyDoesCount(working, subjectId) - beforeDoes,
          );
          dataRef.current = working;
          onChange(working);
        } catch (e) {
          failedCount += 1;
          setAnalyzeError(
            e instanceof Error ? e.message : "자료 분석에 실패했습니다.",
          );
        }
      }

      setAnalyzingSubjectId(null);
      setAnalyzeFocus(null);
      if (addedCount > 0) {
        const doesPart = addedDoes > 0 ? `행동함 ${addedDoes}개` : null;
        const rest = addedCount - addedDoes;
        const restPart = rest > 0 ? `그 외 ${rest}개` : null;
        const detail = [doesPart, restPart].filter(Boolean).join(" · ");
        setAnalyzeNotice(
          options?.preferDoesNotice && addedDoes > 0
            ? `영상에서 본 행동을 행동함 포스트잇 ${addedDoes}개로 붙였어요.${
                failedCount > 0 ? " (일부 자료 분석 실패)" : ""
              }`
            : `공감맵에 ${addedCount}개 항목을 넣었어요${
                detail ? ` (${detail})` : ""
              }.${failedCount > 0 ? " (일부 자료 분석 실패)" : ""}`,
        );
      } else if (failedCount === 0) {
        setAnalyzeNotice(
          "새로 추가할 내용이 없었어요. 이미 반영된 자료예요.",
        );
      }
    },
    [onChange, projectId],
  );

  const handleMediaUploaded = useCallback(
    (subjectId: string, added: ResearchMediaFile[]) => {
      const videos = added.filter(
        (m) => m.kind === "video" && m.storagePath?.trim(),
      );
      if (videos.length === 0) return;
      void analyzeSubjectMedia(subjectId, {
        mediaIds: videos.map((m) => m.id),
        extraMedia: videos,
        preferDoesNotice: true,
      });
    },
    [analyzeSubjectMedia],
  );

  const addSubject = useCallback(() => {
    const current = dataRef.current;
    if (current.researchSynthesis.subjects.length >= MAX_SUBJECTS) return;
    const map = createStage4PersonaMap(current.empathyMaps.length);
    const subject = {
      ...createResearchSubject(current.researchSynthesis.subjects.length),
      empathyMapId: map.id,
    };
    commit({
      ...current,
      empathyMaps: [...current.empathyMaps, map],
      researchSynthesis: {
        ...current.researchSynthesis,
        subjects: [...current.researchSynthesis.subjects, subject],
      },
    });
    setActiveSubjectIndex(current.researchSynthesis.subjects.length);
  }, [commit]);

  const removeSubject = useCallback(
    (index: number) => {
      const current = dataRef.current;
      if (current.researchSynthesis.subjects.length <= 1) return;
      const subject = current.researchSynthesis.subjects[index];
      if (!subject) return;
      const ok = window.confirm(
        `「${subjectLabel(index, subject.name)}」 자료를 삭제할까요?\n\n연결된 공감맵도 함께 지워져요.`,
      );
      if (!ok) return;
      const nextSubjects = current.researchSynthesis.subjects.filter(
        (_, i) => i !== index,
      );
      const nextNotes = current.researchSynthesis.notes.filter(
        (n) => n.subjectId !== subject.id,
      );
      const nextMaps = current.empathyMaps.filter(
        (m) => m.id !== subject.empathyMapId,
      );
      commit({
        ...current,
        empathyMaps: nextMaps.length ? nextMaps : [createStage4PersonaMap(0)],
        researchSynthesis: {
          ...current.researchSynthesis,
          subjects: nextSubjects,
          notes: nextNotes,
        },
      });
      setActiveSubjectIndex((prev) => {
        if (index < prev) return prev - 1;
        if (index === prev) return Math.max(0, prev - 1);
        return prev;
      });
    },
    [commit],
  );

  const handleQuadrantChange = useCallback(
    (quadrantId: EmpathyQuadrantId, items: Parameters<
      typeof updateLinkedMapQuadrant
    >[3]) => {
      if (!activeMap) return;
      commit(
        updateLinkedMapQuadrant(
          dataRef.current,
          activeMap.id,
          quadrantId,
          items,
        ),
      );
    },
    [activeMap, commit],
  );

  const handleBioChange = useCallback(
    (bio: NonNullable<typeof activeMap>["personaBio"]) => {
      if (!activeMap) return;
      const current = dataRef.current;
      const patched = applyPersonaBioToMapFields(activeMap, bio);
      const empathyMaps = current.empathyMaps.map((m) =>
        m.id === activeMap.id ? { ...m, ...patched } : m,
      );
      const subjects = current.researchSynthesis.subjects.map((s) =>
        s.empathyMapId === activeMap.id
          ? {
              ...s,
              name: patched.personaName || s.name,
              context: patched.personaContext || s.context,
            }
          : s,
      );
      commit({
        ...current,
        empathyMaps,
        researchSynthesis: { ...current.researchSynthesis, subjects },
      });
    },
    [activeMap, commit],
  );

  const handleGenerateBio = useCallback(async () => {
    if (!activeMap || bioGenerating) return;
    setBioGenerating(true);
    try {
      const { bio, profile } = await generatePersonaBio({
        problem,
        prePmfSummary: prePmfSummary || undefined,
        personaName: activeMap.personaName,
        personaContext: activeMap.personaContext,
        existingBio: activeMap.personaBio,
        personaProfile: activeMap.personaProfile,
        excludeProfileIds: data.empathyMaps
          .map((m) => m.personaProfile?.sourceId)
          .filter((id): id is string => Boolean(id)),
      });
      const current = dataRef.current;
      const patched = applyPersonaBioToMapFields(activeMap, bio);
      const empathyMaps = current.empathyMaps.map((m) =>
        m.id === activeMap.id
          ? {
              ...m,
              ...patched,
              personaProfile: profile ?? m.personaProfile,
            }
          : m,
      );
      const subjects = current.researchSynthesis.subjects.map((s) =>
        s.empathyMapId === activeMap.id
          ? {
              ...s,
              name: patched.personaName || s.name,
              context: patched.personaContext || s.context,
            }
          : s,
      );
      commit({
        ...current,
        empathyMaps,
        researchSynthesis: { ...current.researchSynthesis, subjects },
      });
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Bio 생성에 실패했습니다.");
    } finally {
      setBioGenerating(false);
    }
  }, [activeMap, bioGenerating, commit, data.empathyMaps, prePmfSummary, problem]);

  return (
    <div className="space-y-4">
      <section className={stagePanel}>
        <h2 className={stageSectionTitle}>발견 정리하기</h2>
        <p className={`mt-1 ${stageSectionLead}`}>
          조사 대상마다 리서치 자료를 올리면 공감맵 4분면에 배치돼요. 자료를 올린
          뒤에는 오른쪽 Kevin에게 다학제적 분석을 요청할 수 있어요.
        </p>
      </section>

      <section className={stagePanel}>
        <p className={`mb-2 ${stageLabel}`}>조사 대상</p>
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="조사 대상"
        >
          {synthesis.subjects.map((subject, idx) => {
            const selected = activeSubjectIndex === idx;
            const canRemove = synthesis.subjects.length > 1;
            const stickyCount = empathyItemCount(data, subject.id);
            const metaParts = [
              stickyCount > 0 ? `맵 ${stickyCount}` : null,
              subject.mediaFiles.length > 0
                ? `자료 ${subject.mediaFiles.length}`
                : null,
            ].filter(Boolean);
            return (
              <div
                key={subject.id}
                className={[
                  "inline-flex max-w-full items-stretch overflow-hidden rounded-md border",
                  selected ? "border-spotlight" : "border-border-warm",
                ].join(" ")}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveSubjectIndex(idx)}
                  className={[
                    "inline-flex min-w-0 items-center gap-1.5 px-2 py-1 text-left transition-colors",
                    selected
                      ? "bg-spotlight text-on-spotlight"
                      : "bg-cream text-foreground hover:bg-surface",
                  ].join(" ")}
                >
                  <SubjectThumbnailPreview
                    subject={subject}
                    index={idx}
                    variant="tab"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold break-keep">
                      {subjectLabel(idx, subject.name)}
                    </span>
                    {metaParts.length ? (
                      <span
                        className={[
                          "block truncate text-[11px]",
                          selected ? "text-on-spotlight/80" : "text-muted",
                        ].join(" ")}
                      >
                        {metaParts.join(" · ")}
                      </span>
                    ) : null}
                  </span>
                </button>
                {canRemove ? (
                  <button
                    type="button"
                    aria-label={`${subjectLabel(idx, subject.name)} 삭제`}
                    onClick={() => removeSubject(idx)}
                    className={[
                      "shrink-0 border-l px-1.5 transition-colors",
                      selected
                        ? "border-on-spotlight/25 text-on-spotlight hover:bg-on-spotlight/10"
                        : "border-border-warm text-muted hover:bg-panel hover:text-foreground",
                    ].join(" ")}
                  >
                    <IconX className="size-3.5" stroke={2.5} aria-hidden />
                  </button>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            disabled={synthesis.subjects.length >= MAX_SUBJECTS}
            onClick={addSubject}
            className="inline-flex items-center gap-1 self-stretch rounded-md border border-dashed border-spotlight/50 px-2 py-1 text-[13px] font-semibold text-foreground hover:bg-highlight disabled:opacity-50"
          >
            <IconPlus className="size-3.5" stroke={2} aria-hidden />
            추가
          </button>
        </div>
      </section>

      <section className={stagePanel}>
        <p className={`mb-4 ${stageLabel}`}>조사 대상자 상세</p>

        {activeSubject ? (
            <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
              <PersonaThumbnailField
                name={activeSubject.name}
                context={activeSubject.context}
                thumbnailUrl={activeSubject.thumbnailUrl}
                onThumbnailChange={(url) =>
                  updateSubjectField(activeSubjectIndex, "thumbnailUrl", url)
                }
              />
              <div className="min-w-0 space-y-3">
                {activeMap ? (
                  <>
                    <PersonaBioFields
                      bio={activeBio}
                      onChange={handleBioChange}
                      onAiGenerate={() => void handleGenerateBio()}
                      aiLoading={bioGenerating}
                      mapId={activeMap.id}
                    />
                    {activeMap.personaProfile ? (
                      <VirtualPersonaProfileCard
                        profile={activeMap.personaProfile}
                      />
                    ) : null}
                  </>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={`mb-1 block ${stageLabel}`}>
                      조사 일시
                    </label>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(activeSubject.conductedAt)}
                      onChange={(e) =>
                        updateSubjectField(
                          activeSubjectIndex,
                          "conductedAt",
                          e.target.value,
                        )
                      }
                      className={`w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput}`}
                    />
                    {activeSubject.conductedAt.trim() ? (
                      <p className={`mt-1 ${stageCaption}`}>
                        {formatConductedAtLabel(activeSubject.conductedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <ResearchSubjectMediaPanel
              projectId={projectId}
              subjectId={activeSubject.id}
              mediaFiles={activeSubject.mediaFiles}
              onChange={(mediaFiles) =>
                updateSubjectMedia(activeSubjectIndex, mediaFiles)
              }
              onUploaded={(added) =>
                handleMediaUploaded(activeSubject.id, added)
              }
              onAnalyze={() => void analyzeSubjectMedia(activeSubject.id)}
              analyzing={analyzingSubjectId === activeSubject.id}
              analyzeError={analyzeError}
            />

            {analyzingSubjectId === activeSubject.id ? (
              <p className={`mt-2 ${stageCaption}`}>
                {analyzeFocus === "video-does"
                  ? "영상에서 행동을 읽어 행동함 분면에 붙이는 중…"
                  : "영상·음성을 분석해 공감맵 4분면에 붙이는 중…"}
              </p>
            ) : analyzeNotice ? (
              <p className={`mt-2 ${stageCaption} text-foreground`}>
                {analyzeNotice}
              </p>
            ) : null}

            {activeMap ? (
              <div className="mt-6 border-t border-border-warm pt-5">
                <p className={`mb-3 ${stageLabel}`}>공감맵</p>
                <EmpathyPostitBoard
                  quadrants={activeMap.quadrants}
                  personaName={activeMap.personaName}
                  personaContext={activeMap.personaContext}
                  personaBio={activeBio}
                  personaProfile={activeMap.personaProfile}
                  showBioFields={false}
                  personaThumbnailUrl={activeMap.personaThumbnailUrl}
                  onThumbnailChange={(url) =>
                    updateSubjectField(activeSubjectIndex, "thumbnailUrl", url)
                  }
                  onChange={handleQuadrantChange}
                  mapId={activeMap.id}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
