"use client";
import { useUiLocale } from "@/hooks/useUiLocale";
import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { useLocalizedEditable } from "@/hooks/useLocalizedEditable";
import { LocalizedEditableTextarea } from "@/components/i18n/LocalizedEditableField";
import { IconChevronDown, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { STAGE3_RESEARCH_PREP_PAGE } from "@/lib/navigation/stageNavLabels";
import { useProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { ToKnowExportMenu } from "@/components/stage/stage3/ToKnowExportMenu";
import { fetchStage2PrePmf } from "@/lib/artifacts/stage2PrePmf";
import { resolveStage1StartingPoint } from "@/lib/stages/stage1/resolveStartingPoint";
import { StageWorkDiscoveryPlaceholder } from "@/components/stage/StageWorkDiscoveryPlaceholder";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { isToKnowDiscoveryActive } from "@/lib/stages/fieldResearch/stage3ToKnowPrepFlow";
import {
  RESEARCH_METHOD_CATALOG,
} from "@/lib/stages/fieldResearch/researchMethodCatalog";
import {
  prePmfToKnowResearchSubjects,
} from "@/lib/stages/stage2/prePmfOverview";
import {
  defaultsForCategory,
  sortRowsByGuideCategory,
  TO_KNOW_GUIDE_CATEGORY_ORDER,
} from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import { ResearchMethodInfoIcon } from "@/components/stage/stage3/ResearchMethodInfoIcon";
import { DT_PROBLEM_STATEMENT_BRIEF } from "@/lib/stages/problemStatement";
import type {
  FieldResearchData,
  ResearchMethodId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";
import {
  stageCaption,
  stageField,
  stageWorkDense,
  stageWorkMeta,
  stageWorkMicro,
  stagePanel,
} from "@/lib/stages/ui";

interface FieldResearchWorkPanelProps {
  projectId: string;
  data: FieldResearchData;
  onChange: (data: FieldResearchData) => void;
  onContinue: () => void;
  onBackToResearchPrep?: () => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

/* ----------------------------- 태그 색상 ----------------------------- */

const TAG_CHIP_BASE =
  "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[13px] font-medium break-keep";

const TOPIC_TAG_COLORS: Record<string, string> = {
  사용자: "border-[#F2D680] bg-[#FFF4D6] text-[#7A5B00]",
  "현재 문제": "border-[#F3C4BD] bg-[#FDE4E1] text-[#8B3A2F]",
  "행동 & 맥락": "border-[#C2DCF0] bg-[#E3F0FB] text-[#2E5B82]",
  "기존 솔루션": "border-[#D0CAEE] bg-[#E8E6F7] text-[#4B3F86]",
  "동기 & 목표": "border-[#C2E2CD] bg-[#E1F2E7] text-[#2E6B45]",
};

const TOPIC_FALLBACK_COLOR = "border-border-warm bg-cream text-foreground";

const SUBJECT_TAG_PALETTE = [
  "border-[#C2E2CD] bg-[#E1F2E7] text-[#2E6B45]",
  "border-[#C2DCF0] bg-[#E3F0FB] text-[#2E5B82]",
  "border-[#D0CAEE] bg-[#E8E6F7] text-[#4B3F86]",
  "border-[#F2D680] bg-[#FFF4D6] text-[#7A5B00]",
  "border-[#F3C4BD] bg-[#FDE4E1] text-[#8B3A2F]",
  "border-[#F2D2B6] bg-[#FCEEDF] text-[#8A5320]",
  "border-[#D6CDE8] bg-[#EFEAF7] text-[#534079]",
  "border-[#C8D6E5] bg-[#EAF1F8] text-[#34536E]",
];

function subjectColor(label: string, index = 0): string {
  if (!label.trim()) return TOPIC_FALLBACK_COLOR;
  let hash = index;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash + label.charCodeAt(i)) | 0;
  }
  return SUBJECT_TAG_PALETTE[Math.abs(hash) % SUBJECT_TAG_PALETTE.length];
}

const METHOD_TAG_COLORS: Record<ResearchMethodId, string> = {
  desk_research: "border-[#C8D6E5] bg-[#EAF1F8] text-[#34536E]",
  survey: "border-[#D6CDE8] bg-[#EFEAF7] text-[#534079]",
  fgd: "border-[#F2D2B6] bg-[#FCEEDF] text-[#8A5320]",
  home_visit_in_depth: "border-[#C2E2CD] bg-[#E5F3EA] text-[#2E6B45]",
  shadowing: "border-[#F3C9C2] bg-[#FBE7E3] text-[#8B3A2F]",
  be_the_customer: "border-[#E4D7AE] bg-[#F8F1D8] text-[#7A5B00]",
  other: "border-border-warm bg-surface text-foreground/80",
};

function topicColor(mid: string): string {
  return TOPIC_TAG_COLORS[mid.trim()] ?? TOPIC_FALLBACK_COLOR;
}

function methodColor(method: ResearchMethodId | ""): string {
  if (!method) return TOPIC_FALLBACK_COLOR;
  return METHOD_TAG_COLORS[method] ?? TOPIC_FALLBACK_COLOR;
}

/* --------------------------- 태그 칩 / 선택 --------------------------- */

function TagChip({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`${TAG_CHIP_BASE} ${colorClass}`}>
      <span className="truncate">{label}</span>
    </span>
  );
}

interface TagOption {
  value: string;
  label: string;
  colorClass: string;
  summary?: string;
}

interface TagSelectCellProps {
  value: string;
  options: TagOption[];
  placeholder: string;
  ariaLabel: string;
  onSelect: (value: string) => void;
  onClear?: () => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
  onAddCustom?: (label: string) => void;
  onDeleteOption?: (value: string) => void;
  isOptionDeletable?: (value: string) => boolean;
}

/** Notion 스타일 태그 셀 — 클릭하면 옵션 팝오버에서 선택/입력 */
function TagSelectCell({
  value,
  options,
  placeholder,
  ariaLabel,
  onSelect,
  onClear,
  allowCustom = false,
  customPlaceholder = "직접 입력",
  onAddCustom,
  onDeleteOption,
  isOptionDeletable,
}: TagSelectCellProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const current =
    options.find((o) => o.value === value) ??
    (value.trim()
      ? { value, label: value, colorClass: TOPIC_FALLBACK_COLOR }
      : undefined);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const width = Math.max(r.width, 220);
    const left = Math.min(
      Math.max(r.left, margin),
      window.innerWidth - margin - width,
    );
    setPos({ top: r.bottom + 4, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
      setDraft("");
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setDraft("");
  };

  const commitCustom = () => {
    const label = draft.trim();
    if (!label) return;
    onAddCustom?.(label);
    close();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1 rounded-md border border-transparent px-1.5 py-1 text-left hover:border-border-warm hover:bg-surface/60"
      >
        {current ? (
          <TagChip label={current.label} colorClass={current.colorClass} />
        ) : (
          <span className={`${stageWorkDense} text-subtle`}>{placeholder}</span>
        )}
        <IconChevronDown
          className="size-3.5 shrink-0 text-muted"
          stroke={2}
          aria-hidden
        />
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={popRef}
              className="fixed z-[9999] rounded-lg border border-border-warm bg-panel p-1 shadow-lg"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <div className="max-h-[260px] overflow-y-auto">
                {options.map((opt) => {
                  const active = opt.value === value;
                  const deletable =
                    Boolean(onDeleteOption) &&
                    (isOptionDeletable ? isOptionDeletable(opt.value) : true);
                  return (
                    <div
                      key={opt.value}
                      className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 ${
                        active ? "bg-surface" : "hover:bg-surface"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(opt.value);
                          close();
                        }}
                        className="flex min-w-0 flex-1 items-center rounded-md px-1 py-1 text-left"
                      >
                        <TagChip
                          label={opt.label}
                          colorClass={opt.colorClass}
                        />
                      </button>
                      {deletable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteOption?.(opt.value);
                            if (opt.value === value) onClear?.();
                          }}
                          aria-label={`${opt.label} 삭제`}
                          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-cream hover:text-foreground"
                        >
                          <IconX className="size-3.5" stroke={2} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
                {!options.length ? (
                  <p className={`px-2 py-1.5 ${stageWorkMicro} text-muted`}>
                    옵션이 없어요
                  </p>
                ) : null}
              </div>

              {value && onClear ? (
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    close();
                  }}
                  className={`mt-1 flex w-full items-center gap-1 rounded-md border-t border-border-warm px-2 py-1.5 ${stageWorkMicro} text-muted hover:bg-surface`}
                >
                  <IconX className="size-3.5" stroke={2} aria-hidden />
                  비우기
                </button>
              ) : null}

              {allowCustom ? (
                <div className="mt-1 flex items-center gap-1 border-t border-border-warm px-1 pt-1.5">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitCustom();
                      }
                    }}
                    placeholder={customPlaceholder}
                    className={`min-w-0 flex-1 rounded-md border border-border-warm px-2 py-1 ${stageWorkMicro} ${stageField}`}
                  />
                  <button
                    type="button"
                    onClick={commitCustom}
                    disabled={!draft.trim()}
                    className={`shrink-0 rounded-md border border-border-warm bg-surface px-2 py-1 ${stageWorkMicro} font-semibold text-foreground hover:bg-cream disabled:opacity-40`}
                  >
                    추가
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/* --------------------------- 자동 높이 입력 --------------------------- */

const INFO_TEXTAREA_MIN_HEIGHT_PX = 38;

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const editable = useLocalizedEditable(value, onChange);
  const { text: localizedPlaceholder } = useLocalizedContent(placeholder ?? "");

  const refit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, INFO_TEXTAREA_MIN_HEIGHT_PX)}px`;
  }, []);

  useLayoutEffect(() => {
    refit();
  }, [editable.value, refit]);

  return (
    <textarea
      ref={ref}
      value={editable.value}
      onChange={(e) => editable.onChange(e.target.value)}
      onFocus={editable.onFocus}
      onBlur={editable.onBlur}
      onInput={refit}
      rows={1}
      placeholder={placeholder ? localizedPlaceholder : placeholder}
      data-translating={editable.translating ? "true" : undefined}
      className={`w-full resize-none overflow-hidden rounded-md border border-transparent bg-transparent px-1.5 py-1 ${stageWorkDense} leading-relaxed break-keep text-foreground caret-foreground placeholder:text-subtle hover:border-border-warm focus:border-border-warm focus:bg-panel`}
    />
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: TagOption[];
  onChange: (value: string) => void;
}

/** To-know 표 상단 — 항목별 필터 (전체 포함) */
function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  const filterOptions = useMemo<TagOption[]>(
    () => [
      {
        value: "",
        label: "전체",
        colorClass: "border-border-warm bg-surface text-muted",
      },
      ...options,
    ],
    [options],
  );

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className={`shrink-0 ${stageWorkMicro} font-semibold text-muted`}>
        {label}
      </span>
      <div className="min-w-[120px] flex-1">
        <TagSelectCell
          value={value}
          options={filterOptions}
          placeholder="전체"
          ariaLabel={`${label} 필터`}
          onSelect={onChange}
          onClear={() => onChange("")}
        />
      </div>
    </div>
  );
}

interface ToKnowTableFilterBarProps {
  filterSubject: string;
  filterTopic: string;
  filterMethod: string;
  subjectOptions: TagOption[];
  topicOptions: TagOption[];
  methodOptions: TagOption[];
  filteredCount: number;
  totalCount: number;
  onFilterSubject: (value: string) => void;
  onFilterTopic: (value: string) => void;
  onFilterMethod: (value: string) => void;
  onClearFilters: () => void;
}

function ToKnowTableFilterBar({
  filterSubject,
  filterTopic,
  filterMethod,
  subjectOptions,
  topicOptions,
  methodOptions,
  filteredCount,
  totalCount,
  onFilterSubject,
  onFilterTopic,
  onFilterMethod,
  onClearFilters,
}: ToKnowTableFilterBarProps) {
  const hasActiveFilters = Boolean(
    filterSubject || filterTopic || filterMethod,
  );

  return (
    <div className="mb-3 rounded-xl border border-border-warm bg-surface/50 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className={`${stageWorkMicro} font-semibold text-foreground`}>
          필터
        </p>
        <p className={`${stageWorkMicro} text-muted`}>
          {hasActiveFilters
            ? `${filteredCount} / ${totalCount}개 항목`
            : `${totalCount}개 항목`}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FilterSelect
          label="조사 대상자"
          value={filterSubject}
          options={subjectOptions}
          onChange={onFilterSubject}
        />
        <FilterSelect
          label="주제"
          value={filterTopic}
          options={topicOptions}
          onChange={onFilterTopic}
        />
        <FilterSelect
          label="리서치 방법"
          value={filterMethod}
          options={methodOptions}
          onChange={onFilterMethod}
        />
      </div>
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 ${stageWorkMicro} font-semibold text-muted hover:bg-cream hover:text-foreground`}
        >
          <IconX className="size-3.5" stroke={2} aria-hidden />
          필터 초기화
        </button>
      ) : null}
    </div>
  );
}

function createToKnowRow(topic = "", subject = ""): ToKnowRow {
  const { big, method } = topic
    ? defaultsForCategory(topic)
    : { big: "tk_target" as const, method: "" as const };
  return {
    id: `tok-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    big,
    mid: topic,
    rowKind: "info",
    infoCategory: subject,
    small: "",
    method,
    note: "",
  };
}

export function FieldResearchWorkPanel({
  projectId,
  data,
  onChange,
  onContinue,
  onBackToResearchPrep,
  saving,
  saveError,
  lastSavedAt,
}: FieldResearchWorkPanelProps) {
  const { projectTitle } = useProjectWorkspace();
  const [exportProblem, setExportProblem] = useState("");
  const [baselineSubjects, setBaselineSubjects] = useState<string[]>([]);
  const [removedTopics, setRemovedTopics] = useState<Set<string>>(
    () => new Set(),
  );
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const toKnowDiscoveryActive = isToKnowDiscoveryActive(data.toKnowPrep);
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(3, locale);

  const toKnowTable = useMemo(
    () =>
      Array.isArray(data.toKnowTable)
        ? data.toKnowTable.filter((r) => r.rowKind !== "core")
        : [],
    [data.toKnowTable],
  );

  const displayRows = useMemo(
    () => sortRowsByGuideCategory(toKnowTable),
    [toKnowTable],
  );

  const filteredRows = useMemo(() => {
    return displayRows.filter((row) => {
      if (
        filterSubject &&
        (row.infoCategory ?? "").trim() !== filterSubject
      ) {
        return false;
      }
      if (filterTopic && row.mid.trim() !== filterTopic) {
        return false;
      }
      if (filterMethod && row.method !== filterMethod) {
        return false;
      }
      return true;
    });
  }, [displayRows, filterMethod, filterSubject, filterTopic]);

  const clearFilters = useCallback(() => {
    setFilterSubject("");
    setFilterTopic("");
    setFilterMethod("");
  }, []);

  const hasActiveFilters = Boolean(
    filterSubject || filterTopic || filterMethod,
  );

  useEffect(() => {
    let cancelled = false;
    void resolveStage1StartingPoint(projectId).then((point) => {
      if (!cancelled) setExportProblem(point);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    void fetchStage2PrePmf(projectId)
      .then((s2) => {
        if (cancelled) return;
        const pre = s2.data;
        setBaselineSubjects(
          prePmfToKnowResearchSubjects(pre.targetUsers, pre.stakeholders),
        );
      })
      .catch(() => {
        if (!cancelled) setBaselineSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const updateRow = useCallback(
    (id: string, patch: Partial<ToKnowRow>) => {
      onChange({
        ...data,
        toKnowTable: toKnowTable.map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        ),
      });
    },
    [data, onChange, toKnowTable],
  );

  const removeRow = useCallback(
    (id: string) => {
      onChange({
        ...data,
        toKnowTable: toKnowTable.filter((r) => r.id !== id),
      });
    },
    [data, onChange, toKnowTable],
  );

  const addRow = useCallback(() => {
    const last = displayRows[displayRows.length - 1];
    const lastTopic = last?.mid ?? "";
    const lastSubject = last?.infoCategory?.trim() ?? baselineSubjects[0] ?? "";
    onChange({
      ...data,
      toKnowTable: [...toKnowTable, createToKnowRow(lastTopic, lastSubject)],
    });
  }, [baselineSubjects, data, displayRows, onChange, toKnowTable]);

  const addRowForSubject = useCallback(
    (subject: string) => {
      const key = subject.trim().toLowerCase();
      const groupRows = displayRows.filter(
        (r) => (r.infoCategory ?? "").trim().toLowerCase() === key,
      );
      const lastTopic = groupRows[groupRows.length - 1]?.mid ?? "";
      onChange({
        ...data,
        toKnowTable: [
          ...toKnowTable,
          createToKnowRow(lastTopic, subject.trim()),
        ],
      });
    },
    [data, displayRows, onChange, toKnowTable],
  );

  const deleteTopicOption = useCallback(
    (mid: string) => {
      const key = mid.trim().toLowerCase();
      if (!key) return;
      setRemovedTopics((prev) => new Set(prev).add(key));
      onChange({
        ...data,
        toKnowTable: toKnowTable.map((row) =>
          row.mid.trim().toLowerCase() === key
            ? { ...row, mid: "", big: "tk_target" as const }
            : row,
        ),
      });
    },
    [data, onChange, toKnowTable],
  );

  /** 조사 대상자 태그 — 사전 조사 + 표에 있는 값 */
  const subjectOptions = useMemo<TagOption[]>(() => {
    const present = new Set<string>();
    const ordered: string[] = [];
    const push = (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (present.has(key)) return;
      present.add(key);
      ordered.push(trimmed);
    };
    for (const label of baselineSubjects) push(label);
    for (const row of toKnowTable) push(row.infoCategory ?? "");
    return ordered.map((label, index) => ({
      value: label,
      label,
      colorClass: subjectColor(label, index),
    }));
  }, [baselineSubjects, toKnowTable]);

  /** 주제 태그 선택지 — 기본 5개 + 표에 있는 사용자 정의 주제 */
  const topicOptions = useMemo<TagOption[]>(() => {
    const present = new Set<string>();
    const ordered: string[] = [];
    const push = (mid: string) => {
      const trimmed = mid.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (present.has(key) || removedTopics.has(key)) return;
      present.add(key);
      ordered.push(trimmed);
    };
    for (const c of TO_KNOW_GUIDE_CATEGORY_ORDER) push(c);
    for (const row of toKnowTable) push(row.mid);
    return ordered.map((mid) => ({
      value: mid,
      label: mid,
      colorClass: topicColor(mid),
    }));
  }, [removedTopics, toKnowTable]);

  const methodOptions = useMemo<TagOption[]>(
    () =>
      RESEARCH_METHOD_CATALOG.map((m) => ({
        value: m.id,
        label: m.label,
        colorClass: methodColor(m.id),
        summary: m.summary,
      })),
    [],
  );

  const subjectColorClass = useCallback(
    (subject: string) =>
      subjectOptions.find((o) => o.value === subject)?.colorClass ??
      TOPIC_FALLBACK_COLOR,
    [subjectOptions],
  );

  /** 조사 대상자별로 행을 묶어 영역을 구분 (대상자 옵션 순 → 미지정 마지막) */
  const subjectGroups = useMemo(() => {
    const buckets = new Map<string, ToKnowRow[]>();
    for (const row of filteredRows) {
      const key = (row.infoCategory ?? "").trim();
      const list = buckets.get(key);
      if (list) list.push(row);
      else buckets.set(key, [row]);
    }
    const ordered: { subject: string; rows: ToKnowRow[] }[] = [];
    for (const opt of subjectOptions) {
      const rows = buckets.get(opt.value);
      if (rows?.length) {
        ordered.push({ subject: opt.value, rows });
        buckets.delete(opt.value);
      }
    }
    for (const [subject, rows] of buckets) {
      if (rows.length) ordered.push({ subject, rows });
    }
    return ordered;
  }, [filteredRows, subjectOptions]);

  const filledCount = toKnowTable.filter((r) => r.small.trim()).length;
  const toKnowOk =
    data.toKnowCoreQuestion.trim().length > 0 &&
    toKnowTable.some((r) => r.small.trim());

  const renderToKnowRow = (row: ToKnowRow) => (
    <tr key={row.id} className="group align-top hover:bg-surface/40">
      <td className="border-b border-border-warm px-2 py-1.5">
        <TagSelectCell
          value={row.mid}
          options={topicOptions}
          placeholder="주제 선택"
          ariaLabel="주제 선택"
          allowCustom
          customPlaceholder="새 주제"
          onSelect={(mid) => {
            const { big } = defaultsForCategory(mid);
            updateRow(row.id, { mid, big });
          }}
          onAddCustom={(mid) => {
            const { big } = defaultsForCategory(mid);
            updateRow(row.id, { mid, big });
          }}
          onClear={() => updateRow(row.id, { mid: "" })}
          onDeleteOption={deleteTopicOption}
        />
      </td>
      <td className="min-w-0 border-b border-border-warm px-2 py-1.5">
        <AutoGrowTextarea
          value={row.small}
          onChange={(small) => updateRow(row.id, { small })}
          placeholder="파악하고자 하는 정보"
        />
      </td>
      <td className="border-b border-border-warm px-2 py-1.5">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <TagSelectCell
              value={row.method}
              options={methodOptions}
              placeholder="방법 선택"
              ariaLabel="리서치 방법 선택"
              onSelect={(method) =>
                updateRow(row.id, { method: method as ResearchMethodId })
              }
              onClear={() => updateRow(row.id, { method: "" })}
            />
          </div>
          <ResearchMethodInfoIcon method={row.method} />
        </div>
      </td>
      <td className="border-b border-border-warm px-2 py-1.5">
        <button
          type="button"
          onClick={() => removeRow(row.id)}
          aria-label="항목 삭제"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted opacity-0 transition-opacity hover:bg-surface hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
        >
          <IconTrash className="size-4" stroke={2} aria-hidden />
        </button>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <section className={stagePanel}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] font-bold tracking-wide text-spotlight uppercase">
            To-know
          </span>
          {!toKnowDiscoveryActive ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={stageCaption}>
                {hasActiveFilters
                  ? `${filteredRows.filter((r) => r.small.trim()).length} / ${filledCount}개`
                  : `${filledCount}개`}
              </span>
              <ToKnowExportMenu
                table={toKnowTable}
                meta={{
                  projectTitle,
                  problem: exportProblem,
                  coreQuestion: data.toKnowCoreQuestion,
                }}
              />
            </div>
          ) : null}
        </div>

        {!toKnowDiscoveryActive ? (
          <p className={`mb-3 ${stageWorkMeta} break-keep`}>
            {purposeCopy.workCaption} 한 줄이 하나의 조사 항목이에요. 조사
            대상자·주제·리서치 방법은 태그로 골라요. 상단 필터로 항목별
            파악 정보를 모아 볼 수 있어요.
          </p>
        ) : null}

        {toKnowDiscoveryActive ? (
          <StageWorkDiscoveryPlaceholder>
            {purposeCopy.placeholderLines[0]}
            <br />
            {purposeCopy.placeholderLines[1]}
          </StageWorkDiscoveryPlaceholder>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-spotlight/35 bg-cream/60 px-3 py-3 sm:px-4">
              <p
                className={`mb-1 ${stageWorkMicro} font-semibold text-spotlight`}
              >
                풀고자 하는 사용자 문제
              </p>
              <p className={`mb-2 ${stageWorkMicro} text-muted break-keep`}>
                To-know를 쓰기 전, 최종적으로 검증하려는 문제가 무엇인지 먼저
                확인해요. {DT_PROBLEM_STATEMENT_BRIEF} 1단계·사전 조사에서
                정리한 내용을 바탕으로 채워져 있어요.
              </p>
              <LocalizedEditableTextarea
                value={data.toKnowCoreQuestion}
                onValueChange={(toKnowCoreQuestion) =>
                  onChange({ ...data, toKnowCoreQuestion })
                }
                rows={3}
                className={`w-full resize-y rounded-lg border border-border-warm bg-panel px-3 py-2.5 ${stageWorkDense} ${stageField}`}
                placeholder="예: 점심시간 카페 대기 줄 때문에 식사 시간을 확보하지 못하는 직장인"
              />
            </div>

            {!toKnowTable.length ? (
              <div
                className={`rounded-xl border border-dashed border-border-warm bg-cream px-3 py-8 text-center ${stageWorkDense} text-muted`}
              >
                <p className="mb-3">아직 To-know 항목이 없어요.</p>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-panel px-3 py-1.5 font-semibold text-foreground hover:bg-surface"
                >
                  <IconPlus className="size-3.5" stroke={2} aria-hidden />
                  첫 항목 추가
                </button>
              </div>
            ) : (
              <>
                <ToKnowTableFilterBar
                  filterSubject={filterSubject}
                  filterTopic={filterTopic}
                  filterMethod={filterMethod}
                  subjectOptions={subjectOptions}
                  topicOptions={topicOptions}
                  methodOptions={methodOptions}
                  filteredCount={filteredRows.length}
                  totalCount={displayRows.length}
                  onFilterSubject={setFilterSubject}
                  onFilterTopic={setFilterTopic}
                  onFilterMethod={setFilterMethod}
                  onClearFilters={clearFilters}
                />

                {filteredRows.length === 0 ? (
                  <div
                    className={`rounded-xl border border-dashed border-border-warm bg-cream px-3 py-8 text-center ${stageWorkDense} text-muted`}
                  >
                    <p className="mb-3">
                      선택한 필터에 맞는 항목이 없어요.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 rounded-md border border-border-warm bg-panel px-3 py-1.5 font-semibold text-foreground hover:bg-surface"
                    >
                      필터 초기화
                    </button>
                  </div>
                ) : (
              <div className="space-y-5">
                {subjectGroups.map((group) => {
                  const groupFilled = group.rows.filter((r) =>
                    r.small.trim(),
                  ).length;
                  return (
                    <div key={group.subject || "__unassigned__"}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <TagChip
                            label={group.subject || "대상자 미지정"}
                            colorClass={
                              group.subject
                                ? subjectColorClass(group.subject)
                                : TOPIC_FALLBACK_COLOR
                            }
                          />
                          <span
                            className={`${stageWorkMicro} text-muted`}
                          >
                            {groupFilled}/{group.rows.length}개
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addRowForSubject(group.subject)}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${stageWorkMicro} font-semibold text-muted hover:bg-surface hover:text-foreground`}
                        >
                          <IconPlus className="size-3.5" stroke={2} aria-hidden />
                          항목 추가
                        </button>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-border-warm bg-panel">
                        <table className="w-full min-w-[620px] border-collapse text-left">
                          <thead>
                            <tr
                              className={`${stageWorkMicro} font-semibold text-muted`}
                            >
                              <th className="w-[150px] border-b border-border-warm bg-surface px-3 py-2">
                                주제
                              </th>
                              <th className="border-b border-border-warm bg-surface px-3 py-2">
                                파악하고자 하는 정보
                              </th>
                              <th className="w-[210px] border-b border-border-warm bg-surface px-3 py-2">
                                리서치 방법
                              </th>
                              <th className="w-[44px] border-b border-border-warm bg-surface px-2 py-2" />
                            </tr>
                          </thead>
                          <tbody>{group.rows.map(renderToKnowRow)}</tbody>
                        </table>
                        <div className="border-t border-border-warm px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => addRowForSubject(group.subject)}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${stageWorkDense} font-semibold text-muted hover:bg-surface hover:text-foreground`}
                          >
                            <IconPlus className="size-3.5" stroke={2} aria-hidden />
                            항목 추가
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="px-0.5">
                  <button
                    type="button"
                    onClick={addRow}
                    className={`inline-flex items-center gap-1 rounded-md border border-dashed border-border-warm px-3 py-1.5 ${stageWorkDense} font-semibold text-muted hover:bg-surface hover:text-foreground`}
                  >
                    <IconPlus className="size-3.5" stroke={2} aria-hidden />
                    새 항목 추가
                  </button>
                </div>
                </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      <div
        className={`${stagePanel} stage-workspace-nav flex flex-wrap items-center justify-between gap-3`}
      >
        <p className={stageCaption}>
          {toKnowOk
            ? "To-know 초안이 준비됐어요. 다음 화면으로 진행할 수 있어요."
            : !data.toKnowCoreQuestion.trim()
              ? "맨 위 「풀고자 하는 사용자 문제」를 확인해 주세요."
              : "파악하고자 하는 정보를 최소 1개는 작성해 주세요."}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <WorkspaceBackButton
            projectId={projectId}
            fallbackStageId={2}
            backPageName={
              onBackToResearchPrep ? STAGE3_RESEARCH_PREP_PAGE : undefined
            }
            onInternalBack={
              onBackToResearchPrep
                ? () => {
                    onBackToResearchPrep();
                    return true;
                  }
                : undefined
            }
          />
          <WorkspaceForwardButton
            stageId={4}
            disabled={!toKnowOk || saving}
            onClick={onContinue}
          />
        </div>
        <p className="w-full text-[14px] text-muted">
          {saveError
            ? saveError
            : saving
              ? "저장 중…"
              : lastSavedAt
                ? `마지막 저장 ${lastSavedAt}`
                : "자동 저장됩니다."}
        </p>
      </div>
    </div>
  );
}
