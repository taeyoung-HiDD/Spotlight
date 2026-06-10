"use client";

import { IconPlus, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ResearchMethodInfoIcon } from "@/components/stage/stage3/ResearchMethodInfoIcon";
import {
  PersonaThumbnailEmpty,
  PersonaThumbnailField,
} from "@/components/stage/stage4/PersonaThumbnailField";
import { SynthesisKindHoverChip } from "@/components/stage/stage4/SynthesisKindHoverChip";
import { ResearchSubjectMediaPanel } from "@/components/stage/stage4/ResearchSubjectMediaPanel";
import { SynthesisPostitBoard } from "@/components/stage/stage4/SynthesisPostitBoard";
import { SynthesisThemeChip } from "@/components/stage/stage4/SynthesisThemeChip";
import { TeamDebriefSection } from "@/components/stage/stage4/TeamDebriefSection";
import { hasSynthesisDebriefSource } from "@/lib/stages/stage4/buildSynthesisDebriefContext";
import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";
import { resolvePersonaThumbnailDisplayUrl } from "@/lib/stages/stage4/personaThumbnail";
import type { ResearchSubject } from "@/lib/stages/stage4/researchSynthesisSubject";
import { RESEARCH_METHOD_CATALOG } from "@/lib/stages/fieldResearch/researchMethodCatalog";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";
import { transcribeResearchAudioToQuotes } from "@/lib/stages/stage4/researchAudioToQuoteClient";
import {
  formatConductedAtLabel,
  researchMethodLabel,
  toDatetimeLocalValue,
} from "@/lib/stages/stage4/researchSynthesisSubject";
import {
  countNotesByKind,
  createResearchSubject,
  createSynthesisNote,
  SYNTHESIS_NOTE_KINDS,
  type ResearchSynthesisData,
  type SynthesisNoteKind,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import {
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
  stageTextarea,
} from "@/lib/stages/ui";

const MAX_SUBJECTS = 12;

interface Stage4ResearchSynthesisPanelProps {
  projectId: string;
  synthesis: ResearchSynthesisData;
  onChange: (next: ResearchSynthesisData) => void;
  onImportStage3: () => void;
  onImportEmpathy: () => void;
  importing: boolean;
  onRequestKevinDebrief: () => void;
  kevinDebriefLoading: boolean;
}

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
        <PersonaThumbnailEmpty variant={variant === "tab" ? "tab" : "compact"} />
      )}
    </span>
  );
}

export function Stage4ResearchSynthesisPanel({
  projectId,
  synthesis,
  onChange,
  onImportStage3,
  onImportEmpathy,
  importing,
  onRequestKevinDebrief,
  kevinDebriefLoading,
}: Stage4ResearchSynthesisPanelProps) {
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [themeDraft, setThemeDraft] = useState("");

  const activeSubject = synthesis.subjects[activeSubjectIndex];

  const synthesisRef = useRef(synthesis);
  useEffect(() => {
    synthesisRef.current = synthesis;
  }, [synthesis]);

  const updateSynthesis = useCallback(
    (patch: Partial<ResearchSynthesisData>) => {
      onChange({ ...synthesisRef.current, ...patch });
    },
    [onChange],
  );

  const processedAudioMediaIdsRef = useRef<Set<string>>(new Set());
  const processingAudioMediaIdsRef = useRef<Set<string>>(new Set());
  const [pendingAudioTranscriptions, setPendingAudioTranscriptions] = useState<
    string[]
  >([]);
  const [audioTranscribeError, setAudioTranscribeError] = useState<string | null>(
    null,
  );

  const updateSubjectField = useCallback(
    (
      index: number,
      field: keyof ResearchSynthesisData["subjects"][number],
      value: string,
    ) => {
      const nextSubjects = [...synthesisRef.current.subjects];
      const item = nextSubjects[index];
      if (!item) return;
      nextSubjects[index] = { ...item, [field]: value };
      updateSynthesis({ subjects: nextSubjects });
    },
    [updateSynthesis],
  );

  const appendQuoteNotesFromAudio = useCallback(
    (subjectId: string, audioMediaId: string, quotes: string[]) => {
      const base = synthesisRef.current;
      const audioSourceRef = `audio:${audioMediaId}`;

      const existing = base.notes.filter(
        (n) =>
          n.subjectId === subjectId &&
          n.kind === "quote" &&
          n.sourceRef === audioSourceRef,
      );

      const toAdd = quotes
        .map((q) => q.trim())
        .filter(Boolean)
        .filter(
          (q) => !existing.some((n) => n.text.trim() === q.trim()),
        );

      if (toAdd.length === 0) return;

      const nextNotes = [
        ...base.notes,
        ...toAdd.map((text) => ({
          ...createSynthesisNote(subjectId, "quote"),
          text,
          sourceRef: audioSourceRef,
        })),
      ];

      onChange({ ...base, notes: nextNotes });
    },
    [onChange],
  );

  const updateSubjectMedia = useCallback(
    (index: number, mediaFiles: ResearchMediaFile[]) => {
      const base = synthesisRef.current;
      const prevMediaFiles = base.subjects[index]?.mediaFiles ?? [];

      const newlyAddedAudio = mediaFiles.filter(
        (m) =>
          m.kind === "audio" &&
          !prevMediaFiles.some((pm) => pm.id === m.id),
      );

      const nextSubjects = [...base.subjects];
      const item = nextSubjects[index];
      if (!item) return;
      nextSubjects[index] = { ...item, mediaFiles };
      updateSynthesis({ subjects: nextSubjects });

      if (newlyAddedAudio.length === 0) return;

      const targetSubject = base.subjects[index];
      if (!targetSubject) return;

      setAudioTranscribeError(null);

      for (const audio of newlyAddedAudio) {
        if (!audio.storagePath?.trim()) continue;
        if (processedAudioMediaIdsRef.current.has(audio.id)) continue;
        if (processingAudioMediaIdsRef.current.has(audio.id)) continue;

        processingAudioMediaIdsRef.current.add(audio.id);
        setPendingAudioTranscriptions((prev) =>
          prev.includes(audio.id) ? prev : [...prev, audio.id],
        );

        void (async () => {
          try {
            const { quotes } = await transcribeResearchAudioToQuotes({
              projectId,
              subjectId: targetSubject.id,
              audio: audio as ResearchMediaFile & { kind: "audio" },
            });

            if (quotes.length > 0) {
              appendQuoteNotesFromAudio(
                targetSubject.id,
                audio.id,
                quotes,
              );
            }

            processedAudioMediaIdsRef.current.add(audio.id);
          } catch (e) {
            setAudioTranscribeError(
              e instanceof Error ? e.message : "음성 해석에 실패했습니다.",
            );
          } finally {
            processingAudioMediaIdsRef.current.delete(audio.id);
            setPendingAudioTranscriptions((prev) =>
              prev.filter((id) => id !== audio.id),
            );
          }
        })();
      }
    },
    [appendQuoteNotesFromAudio, projectId, updateSynthesis],
  );

  const addSubject = useCallback(() => {
    if (synthesis.subjects.length >= MAX_SUBJECTS) return;
    const nextSubjects = [
      ...synthesis.subjects,
      createResearchSubject(synthesis.subjects.length),
    ];
    setActiveSubjectIndex(nextSubjects.length - 1);
    updateSynthesis({ subjects: nextSubjects });
  }, [synthesis.subjects, updateSynthesis]);

  const removeSubject = useCallback(
    (index: number) => {
      if (synthesis.subjects.length <= 1) return;
      const subject = synthesis.subjects[index];
      if (!subject) return;
      const ok = window.confirm(
        `「${subjectLabel(index, subject.name)}」 자료를 삭제할까요?\n\n연결된 포스트잇도 함께 지워져요.`,
      );
      if (!ok) return;
      const nextSubjects = synthesis.subjects.filter((_, i) => i !== index);
      const nextNotes = synthesis.notes.filter(
        (n) => n.subjectId !== subject.id,
      );
      updateSynthesis({ subjects: nextSubjects, notes: nextNotes });
      setActiveSubjectIndex((prev) => {
        if (index < prev) return prev - 1;
        if (index === prev) return Math.max(0, prev - 1);
        return prev;
      });
    },
    [synthesis.notes, synthesis.subjects, updateSynthesis],
  );

  const addNote = useCallback(
    (kind: SynthesisNoteKind) => {
      if (!activeSubject) return;
      const note = createSynthesisNote(activeSubject.id, kind);
      updateSynthesis({ notes: [...synthesis.notes, note] });
    },
    [activeSubject, synthesis.notes, updateSynthesis],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<{ text: string; theme: string }>) => {
      updateSynthesis({
        notes: synthesis.notes.map((n) =>
          n.id === id ? { ...n, ...patch } : n,
        ),
      });
    },
    [synthesis.notes, updateSynthesis],
  );

  const removeNote = useCallback(
    (id: string) => {
      updateSynthesis({
        notes: synthesis.notes.filter((n) => n.id !== id),
      });
    },
    [synthesis.notes, updateSynthesis],
  );

  const addTheme = useCallback(() => {
    const t = themeDraft.trim();
    if (!t || synthesis.themes.includes(t)) return;
    updateSynthesis({ themes: [...synthesis.themes, t] });
    setThemeDraft("");
  }, [synthesis.themes, themeDraft, updateSynthesis]);

  const removeTheme = useCallback(
    (theme: string) => {
      updateSynthesis({
        themes: synthesis.themes.filter((t) => t !== theme),
        notes: synthesis.notes.map((n) =>
          n.theme === theme ? { ...n, theme: "" } : n,
        ),
      });
    },
    [synthesis.notes, synthesis.themes, updateSynthesis],
  );

  const subjectNotes = useMemo(() => {
    if (!activeSubject) return [];
    return synthesis.notes.filter((n) => n.subjectId === activeSubject.id);
  }, [activeSubject, synthesis.notes]);

  return (
    <div className="space-y-4">
      <section className={stagePanel}>
        <h2 className={stageSectionTitle}>데이터 정리 · 한눈에 보기</h2>
        <p className={`mt-1 ${stageSectionLead}`}>
          조사 대상별로 언급한 것·관찰한 것·발견한 것을 색으로 나눠
          정리해요. 파란색 발견한 것은 조사 중 떠오른 생각·인사이트를 직접
          적어요.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {SYNTHESIS_NOTE_KINDS.map((k) => (
            <SynthesisKindHoverChip
              key={k.id}
              description={k.description}
              className={[
                "items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-medium text-foreground",
                k.legendClass,
              ].join(" ")}
            >
              <span className="font-semibold">{k.label}</span>
              <span className="text-muted">· {k.colorHint}</span>
            </SynthesisKindHoverChip>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importing}
            onClick={onImportStage3}
            className="rounded-md border border-border-warm bg-cream px-3 py-2 text-[14px] font-semibold text-foreground hover:bg-surface disabled:opacity-50"
          >
            {importing
              ? "가져오는 중…"
              : "단계 3 조사 기록 가져오기"}
          </button>
          <button
            type="button"
            disabled={importing}
            onClick={onImportEmpathy}
            className="rounded-md border border-border-warm bg-cream px-3 py-2 text-[14px] font-semibold text-foreground hover:bg-surface disabled:opacity-50"
          >
            공감맵에서 가져오기
          </button>
        </div>
      </section>

      <section className={stagePanel}>
        <p className={`mb-3 ${stageLabel}`}>조사 대상 한눈에</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {synthesis.subjects.map((subject, idx) => {
            const counts = countNotesByKind(synthesis, subject.id);
            const selected = activeSubjectIndex === idx;
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setActiveSubjectIndex(idx)}
                className={[
                  "flex gap-3 rounded-xl border p-3 text-left transition-colors",
                  selected
                    ? "border-spotlight bg-highlight"
                    : "border-border-warm bg-cream/50 hover:bg-cream",
                ].join(" ")}
              >
                <SubjectThumbnailPreview subject={subject} index={idx} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-foreground break-keep">
                    {subjectLabel(idx, subject.name)}
                  </p>
                  <p className={`mt-0.5 ${stageCaption}`}>
                    {researchMethodLabel(subject.researchMethodId)}
                    {subject.conductedAt.trim()
                      ? ` · ${formatConductedAtLabel(subject.conductedAt)}`
                      : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-muted">
                    <span>언급 {counts.quote}</span>
                    <span>관찰 {counts.observation}</span>
                    <span>발견 {counts.finding}</span>
                    {subject.mediaFiles.length > 0 ? (
                      <span>자료 {subject.mediaFiles.length}</span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={stagePanel}>
        <div
          className="border-b border-border-warm pb-4"
          role="tablist"
          aria-label="조사 대상별 데이터"
        >
          <p className={`mb-2.5 ${stageLabel}`}>조사 대상</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {synthesis.subjects.map((subject, idx) => {
              const selected = activeSubjectIndex === idx;
              const canRemove = synthesis.subjects.length > 1;
              return (
                <div
                  key={subject.id}
                  className={[
                    "inline-flex items-stretch overflow-hidden rounded-md border",
                    selected ? "border-spotlight" : "border-border-warm",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveSubjectIndex(idx)}
                    className={[
                      "inline-flex items-center gap-2 px-2.5 py-1.5 text-[15px] font-semibold transition-colors break-keep",
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
                    {subjectLabel(idx, subject.name)}
                  </button>
                  {canRemove ? (
                    <button
                      type="button"
                      aria-label={`${subjectLabel(idx, subject.name)} 삭제`}
                      onClick={() => removeSubject(idx)}
                      className={[
                        "inline-flex items-center justify-center border-l px-2 transition-colors",
                        selected
                          ? "border-on-spotlight/25 bg-spotlight text-on-spotlight"
                          : "border-border-warm bg-cream text-muted hover:text-foreground",
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
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-spotlight/50 px-3 py-2 text-[15px] font-semibold text-foreground hover:bg-highlight disabled:opacity-50"
            >
              <IconPlus className="size-4" stroke={2} aria-hidden />
              추가
            </button>
          </div>
        </div>

        {activeSubject ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
              <PersonaThumbnailField
                name={activeSubject.name}
                context={activeSubject.context}
                thumbnailUrl={activeSubject.thumbnailUrl}
                onThumbnailChange={(url) =>
                  updateSubjectField(activeSubjectIndex, "thumbnailUrl", url)
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={`mb-1 block ${stageLabel}`}>이름</label>
                <input
                  value={activeSubject.name}
                  onChange={(e) =>
                    updateSubjectField(
                      activeSubjectIndex,
                      "name",
                      e.target.value,
                    )
                  }
                  placeholder="조사 대상 이름"
                  className={`w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput}`}
                />
              </div>
              <div>
                <label className={`mb-1 block ${stageLabel}`}>프로필</label>
                <input
                  value={activeSubject.context}
                  onChange={(e) =>
                    updateSubjectField(
                      activeSubjectIndex,
                      "context",
                      e.target.value,
                    )
                  }
                  placeholder="한 줄 프로필"
                  className={`w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageInput}`}
                />
              </div>
              <div>
                <label
                  htmlFor={`research-method-${activeSubject.id}`}
                  className={`mb-1 block ${stageLabel}`}
                >
                  리서치 방법
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    id={`research-method-${activeSubject.id}`}
                    value={activeSubject.researchMethodId}
                    onChange={(e) =>
                      updateSubjectField(
                        activeSubjectIndex,
                        "researchMethodId",
                        e.target.value,
                      )
                    }
                    className={`min-w-0 flex-1 rounded-md border border-border-warm bg-panel px-3 py-2 ${stageField} ${stageInput}`}
                  >
                    <option value="">선택…</option>
                    {RESEARCH_METHOD_CATALOG.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <ResearchMethodInfoIcon
                    method={activeSubject.researchMethodId as ResearchMethodId | ""}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor={`conducted-at-${activeSubject.id}`}
                  className={`mb-1 block ${stageLabel}`}
                >
                  조사 일시
                </label>
                <input
                  id={`conducted-at-${activeSubject.id}`}
                  type="datetime-local"
                  value={toDatetimeLocalValue(activeSubject.conductedAt)}
                  onChange={(e) =>
                    updateSubjectField(
                      activeSubjectIndex,
                      "conductedAt",
                      e.target.value,
                    )
                  }
                  className={`w-full rounded-md border border-border-warm bg-panel px-3 py-2 ${stageField} ${stageInput} [color-scheme:light]`}
                />
                {activeSubject.conductedAt.trim() ? (
                  <p className={`mt-1.5 ${stageCaption}`}>
                    {formatConductedAtLabel(activeSubject.conductedAt)}
                  </p>
                ) : (
                  <p className={`mt-1.5 ${stageCaption}`}>
                    달력에서 날짜와 시간을 선택해 주세요.
                  </p>
                )}
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
            />

            {pendingAudioTranscriptions.length > 0 ? (
              <p className={`mt-2 ${stageCaption}`}>
                음성 해석 중… (포스트잇 자동 생성)
              </p>
            ) : null}
            {audioTranscribeError ? (
              <p className="mt-2 text-[14px] text-red-700" role="alert">
                {audioTranscribeError}
              </p>
            ) : null}

            <SynthesisPostitBoard
              notes={subjectNotes}
              themes={synthesis.themes}
              onAdd={addNote}
              onChange={(id, text) => updateNote(id, { text })}
              onThemeChange={(id, theme) => updateNote(id, { theme })}
              onRemove={removeNote}
            />
          </div>
        ) : null}
      </section>

      <section className={stagePanel}>
        <p className={stageLabel}>테마별 묶기</p>
        <p className={`mt-1 ${stageCaption}`}>
          인용·관찰을 주제별로 묶으면 패턴이 보여요. 테마마다 색이 달라지고,
          포스트잇 아래에 테마 이름이 표시돼요.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {synthesis.themes.map((theme) => (
            <span
              key={theme}
              className="inline-flex items-center gap-1"
            >
              <SynthesisThemeChip
                theme={theme}
                themes={synthesis.themes}
                className="text-[13px] px-2.5 py-1"
              />
              <button
                type="button"
                aria-label={`${theme} 삭제`}
                onClick={() => removeTheme(theme)}
                className="rounded p-0.5 text-muted hover:bg-cream hover:text-foreground"
              >
                <IconX className="size-3.5" stroke={2} aria-hidden />
              </button>
            </span>
          ))}
          <input
            value={themeDraft}
            onChange={(e) => setThemeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTheme();
              }
            }}
            placeholder="테마 이름"
            className={`max-w-[10rem] rounded-md border border-border-warm px-2.5 py-1.5 ${stageField} ${stageInput}`}
          />
          <button
            type="button"
            onClick={addTheme}
            className="rounded-md border border-border-warm px-2.5 py-1.5 text-[14px] font-semibold hover:bg-cream"
          >
            테마 추가
          </button>
        </div>
      </section>

      <TeamDebriefSection
        projectId={projectId}
        note={synthesis.teamDebriefNote}
        mediaFiles={synthesis.teamDebriefMediaFiles}
        onNoteChange={(teamDebriefNote) => updateSynthesis({ teamDebriefNote })}
        onMediaChange={(teamDebriefMediaFiles) =>
          updateSynthesis({ teamDebriefMediaFiles })
        }
        onRequestKevinDebrief={onRequestKevinDebrief}
        kevinDebriefLoading={kevinDebriefLoading}
        kevinDebriefDisabled={!hasSynthesisDebriefSource(synthesis)}
      />
    </div>
  );
}
