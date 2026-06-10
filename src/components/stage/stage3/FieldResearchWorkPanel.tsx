"use client";

import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
} from "@tabler/icons-react";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { STAGE4_EMPATHY_MAP_PAGE } from "@/lib/navigation/stageNavLabels";
import { useProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { ToKnowExportMenu } from "@/components/stage/stage3/ToKnowExportMenu";
import { resolveStage1StartingPoint } from "@/lib/stages/stage1/resolveStartingPoint";
import { StageWorkDiscoveryPlaceholder } from "@/components/stage/StageWorkDiscoveryPlaceholder";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { isToKnowDiscoveryActive } from "@/lib/stages/fieldResearch/stage3ToKnowPrepFlow";
import {
  getResearchMethodEntry,
  orderedToKnowMethodSections,
  RESEARCH_METHOD_CATALOG,
  TO_KNOW_UNASSIGNED_METHOD,
  toKnowMethodSectionKey,
  toKnowMethodSectionLabel,
} from "@/lib/stages/fieldResearch/researchMethodCatalog";
import {
  defaultsForCategory,
  guideCategoryLabel,
  nextCustomCategoryName,
  renameCategoryInRows,
  sortRowsByGuideCategory,
  TO_KNOW_GUIDE_CATEGORY_ORDER,
  type ToKnowGuideCategory,
} from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import { ResearchMethodInfoIcon } from "@/components/stage/stage3/ResearchMethodInfoIcon";
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

type ToKnowGroupMode = "category" | "method";

interface FieldResearchWorkPanelProps {
  projectId: string;
  data: FieldResearchData;
  onChange: (data: FieldResearchData) => void;
  onContinue: () => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

function prefixedSectionKey(mode: ToKnowGroupMode, id: string): string {
  return `${mode}:${id}`;
}

interface ToKnowRowsTableProps {
  rows: ToKnowRow[];
  groupMode: ToKnowGroupMode;
  onUpdateRow: (id: string, patch: Partial<ToKnowRow>) => void;
  onRemoveRow: (id: string) => void;
}

function ToKnowRowsTable({
  rows,
  groupMode,
  onUpdateRow,
  onRemoveRow,
}: ToKnowRowsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-foreground">
        <thead className="bg-surface/60">
          <tr className={`${stageWorkMicro} font-semibold text-muted`}>
            <th className="border-b border-border-warm px-3 py-1.5">핵심 질문</th>
            <th className="w-[34%] border-b border-border-warm px-3 py-1.5">
              파악하고자 하는 정보
            </th>
            {groupMode === "method" ? (
              <th className="w-28 border-b border-border-warm px-3 py-1.5">
                주제
              </th>
            ) : null}
            <th className="w-36 border-b border-border-warm px-3 py-1.5">
              리서치 방법
            </th>
            <th className="w-16 border-b border-border-warm px-3 py-1.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="border-b border-border-warm px-3 py-2">
                <input
                  value={row.small}
                  onChange={(e) =>
                    onUpdateRow(row.id, { small: e.target.value })
                  }
                  className={`w-full rounded-md border border-border-warm bg-panel px-2 py-1 ${stageWorkDense} ${stageField}`}
                  placeholder="핵심 질문"
                />
              </td>
              <td className="border-b border-border-warm px-3 py-2">
                <textarea
                  value={row.note ?? ""}
                  onChange={(e) =>
                    onUpdateRow(row.id, { note: e.target.value })
                  }
                  rows={2}
                  className={`w-full resize-y rounded-md border border-border-warm bg-panel px-2 py-1 ${stageWorkDense} ${stageField}`}
                  placeholder="파악하고자 하는 정보"
                />
              </td>
              {groupMode === "method" ? (
                <td className="border-b border-border-warm px-3 py-2">
                  <input
                    value={row.mid}
                    onChange={(e) =>
                      onUpdateRow(row.id, { mid: e.target.value })
                    }
                    className={`w-full rounded-md border border-border-warm bg-panel px-2 py-1 ${stageWorkDense} ${stageField}`}
                    placeholder="주제"
                  />
                </td>
              ) : null}
              <td className="border-b border-border-warm px-3 py-2">
                <div className="flex items-center gap-1">
                  <select
                    value={row.method}
                    onChange={(e) =>
                      onUpdateRow(row.id, {
                        method: e.target.value as ToKnowRow["method"],
                      })
                    }
                    className={`min-w-0 flex-1 rounded-md border border-border-warm bg-panel px-2 py-1 ${stageWorkDense} ${stageField}`}
                  >
                    <option value="">선택…</option>
                    {RESEARCH_METHOD_CATALOG.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <ResearchMethodInfoIcon method={row.method} />
                </div>
              </td>
              <td className="border-b border-border-warm px-3 py-2">
                <button
                  type="button"
                  className={`${stageWorkDense} font-semibold text-muted underline`}
                  onClick={() => onRemoveRow(row.id)}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function insertAfterCategory(
  rows: ToKnowRow[],
  category: string,
  row: ToKnowRow,
): ToKnowRow[] {
  let lastIdx = -1;
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].mid === category) lastIdx = i;
  }
  if (lastIdx === -1) {
    const catIndex = TO_KNOW_GUIDE_CATEGORY_ORDER.indexOf(
      category as ToKnowGuideCategory,
    );
    let insertAt = rows.length;
    for (let c = catIndex - 1; c >= 0; c -= 1) {
      const prevCat = TO_KNOW_GUIDE_CATEGORY_ORDER[c];
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (rows[i].mid === prevCat) {
          insertAt = i + 1;
          c = -1;
          break;
        }
      }
    }
    const next = [...rows];
    next.splice(insertAt, 0, row);
    return next;
  }
  const next = [...rows];
  next.splice(lastIdx + 1, 0, row);
  return next;
}

export function FieldResearchWorkPanel({
  projectId,
  data,
  onChange,
  onContinue,
  saving,
  saveError,
  lastSavedAt,
}: FieldResearchWorkPanelProps) {
  const toKnowTable = Array.isArray(data.toKnowTable) ? data.toKnowTable : [];
  const { projectTitle } = useProjectWorkspace();
  const [exportProblem, setExportProblem] = useState("");

  const [groupMode, setGroupMode] = useState<ToKnowGroupMode>("category");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(),
  );
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({});
  const didAutoExpandToKnow = useRef(false);
  const prevGroupModeRef = useRef<ToKnowGroupMode>("category");
  const toKnowDiscoveryActive = isToKnowDiscoveryActive(data.toKnowPrep);
  const purposeCopy = getStagePurposeCopy(3);

  function newRow(category: string): ToKnowRow {
    const label = category.trim() || "새 주제";
    const { big, method } = defaultsForCategory(label);
    return {
      id: `tok-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      big,
      mid: label,
      small: "",
      method,
      note: "",
    };
  }

  const updateRow = (id: string, patch: Partial<ToKnowRow>) => {
    onChange({
      ...data,
      toKnowTable: toKnowTable.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const sortedToKnowRows = useMemo(
    () => sortRowsByGuideCategory(toKnowTable),
    [toKnowTable],
  );

  const toKnowSections = useMemo(() => {
    const present = new Set(
      toKnowTable.map((r) => r.mid.trim()).filter(Boolean),
    );
    const ordered = TO_KNOW_GUIDE_CATEGORY_ORDER.filter((c) => present.has(c));
    const extra = [...present].filter(
      (c) => !TO_KNOW_GUIDE_CATEGORY_ORDER.includes(c as ToKnowGuideCategory),
    );
    return [...ordered, ...extra.sort((a, b) => a.localeCompare(b, "ko"))];
  }, [toKnowTable]);

  const rowsByCategory = useMemo(() => {
    const map = new Map<string, ToKnowRow[]>();
    for (const cat of toKnowSections) map.set(cat, []);
    for (const row of sortedToKnowRows) {
      const cat = row.mid.trim() || "기타";
      const list = map.get(cat) ?? [];
      list.push(row);
      map.set(cat, list);
    }
    return map;
  }, [sortedToKnowRows, toKnowSections]);

  const methodSections = useMemo(
    () =>
      orderedToKnowMethodSections([
        ...RESEARCH_METHOD_CATALOG.map((m) => m.id),
        TO_KNOW_UNASSIGNED_METHOD,
      ]),
    [],
  );

  const rowsByMethod = useMemo(() => {
    const map = new Map<string, ToKnowRow[]>();
    for (const key of methodSections) map.set(key, []);
    for (const row of sortedToKnowRows) {
      const key = toKnowMethodSectionKey(row.method);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [sortedToKnowRows, methodSections]);

  const activeSections =
    groupMode === "category" ? toKnowSections : methodSections;

  useEffect(() => {
    if (didAutoExpandToKnow.current || toKnowDiscoveryActive) return;
    if (!toKnowTable.length) return;
    didAutoExpandToKnow.current = true;
    setExpandedSections(
      new Set(
        toKnowSections.map((c) => prefixedSectionKey("category", c)),
      ),
    );
  }, [toKnowTable, toKnowDiscoveryActive, toKnowSections]);

  useEffect(() => {
    if (prevGroupModeRef.current === groupMode) return;
    prevGroupModeRef.current = groupMode;
    setExpandedSections(
      new Set(
        activeSections.map((id) => prefixedSectionKey(groupMode, id)),
      ),
    );
  }, [groupMode, activeSections]);

  useEffect(() => {
    let cancelled = false;
    void resolveStage1StartingPoint(projectId).then((point) => {
      if (!cancelled) setExportProblem(point);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const toggleSection = (sectionId: string) => {
    const key = prefixedSectionKey(groupMode, sectionId);
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSectionExpanded = (sectionId: string) =>
    expandedSections.has(prefixedSectionKey(groupMode, sectionId));

  const renameCategory = (oldCategory: string, newCategory: string) => {
    const next = newCategory.trim();
    if (!next || oldCategory.trim() === next) return;
    onChange({
      ...data,
      toKnowTable: renameCategoryInRows(toKnowTable, oldCategory, next),
    });
    setExpandedSections((prev) => {
      const updated = new Set(prev);
      const oldKey = prefixedSectionKey("category", oldCategory);
      const newKey = prefixedSectionKey("category", next);
      if (updated.has(oldKey)) {
        updated.delete(oldKey);
        updated.add(newKey);
      }
      return updated;
    });
    setCategoryDrafts((prev) => {
      const { [oldCategory]: _, ...rest } = prev;
      return rest;
    });
  };

  const addToKnowRow = (category: string) => {
    const row = newRow(category);
    onChange({
      ...data,
      toKnowTable: insertAfterCategory(toKnowTable, category, row),
    });
    setExpandedSections((prev) =>
      new Set(prev).add(prefixedSectionKey("category", category)),
    );
  };

  const addRowToMethod = (methodKey: string) => {
    const method: ResearchMethodId | "" =
      methodKey === TO_KNOW_UNASSIGNED_METHOD
        ? ""
        : (methodKey as ResearchMethodId);
    const row: ToKnowRow = {
      ...newRow("미분류"),
      method,
    };
    onChange({
      ...data,
      toKnowTable: [...toKnowTable, row],
    });
    setExpandedSections((prev) =>
      new Set(prev).add(prefixedSectionKey("method", methodKey)),
    );
  };

  const addCustomCategory = () => {
    const name = nextCustomCategoryName(
      toKnowTable.map((r) => r.mid.trim()).filter(Boolean),
    );
    const row = newRow(name);
    onChange({
      ...data,
      toKnowTable: [...toKnowTable, row],
    });
    setExpandedSections((prev) =>
      new Set(prev).add(prefixedSectionKey("category", name)),
    );
  };

  const removeRow = (id: string) => {
    onChange({ ...data, toKnowTable: toKnowTable.filter((r) => r.id !== id) });
  };

  const toKnowOk = toKnowTable.some((r) => r.small.trim());

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
                {data.toKnowTable.filter((r) => r.small.trim()).length}개
              </span>
              <ToKnowExportMenu
                table={toKnowTable}
                meta={{
                  projectTitle,
                  problem: exportProblem,
                }}
              />
            </div>
          ) : null}
        </div>
        {!toKnowDiscoveryActive ? (
          <p className={`mb-2 ${stageWorkMeta} break-keep`}>
            {purposeCopy.workCaption} 주제·리서치 방법으로 묶어서 볼 수
            있어요. 핵심 질문·파악 정보 · 1단계 문제점·2단계 사전 조사 연계
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
        {!toKnowTable.length ? (
          <div className={`rounded-xl border border-border-warm bg-cream px-3 py-6 text-center ${stageWorkDense} text-muted`}>
            To-know 표를 준비하는 중…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-warm bg-cream">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-warm px-3 py-2">
              <span className={`${stageWorkMicro} font-semibold text-muted`}>
                묶어 보기
              </span>
              <div
                className="inline-flex rounded-lg border border-border-warm bg-panel p-0.5"
                role="group"
                aria-label="To-know 묶어 보기"
              >
                <button
                  type="button"
                  className={`rounded-md px-3 py-1 ${stageWorkDense} font-semibold ${
                    groupMode === "category"
                      ? "bg-spotlight text-on-spotlight"
                      : "text-foreground hover:bg-surface"
                  }`}
                  aria-pressed={groupMode === "category"}
                  onClick={() => setGroupMode("category")}
                >
                  주제
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-1 ${stageWorkDense} font-semibold ${
                    groupMode === "method"
                      ? "bg-spotlight text-on-spotlight"
                      : "text-foreground hover:bg-surface"
                  }`}
                  aria-pressed={groupMode === "method"}
                  onClick={() => setGroupMode("method")}
                >
                  리서치 방법
                </button>
              </div>
            </div>
            <div className="min-w-[640px] divide-y divide-border-warm">
              {activeSections.map((sectionId) => {
                const rows =
                  groupMode === "category"
                    ? (rowsByCategory.get(sectionId) ?? [])
                    : (rowsByMethod.get(sectionId) ?? []);
                const expanded = isSectionExpanded(sectionId);
                const filledCount = rows.filter((r) => r.small.trim()).length;

                const categoryDisplay =
                  categoryDrafts[sectionId] ??
                  guideCategoryLabel(sectionId);
                const methodEntry =
                  sectionId !== TO_KNOW_UNASSIGNED_METHOD
                    ? getResearchMethodEntry(sectionId as ResearchMethodId)
                    : null;
                const sectionTitle =
                  groupMode === "category"
                    ? categoryDisplay
                    : toKnowMethodSectionLabel(sectionId);

                return (
                  <div key={`${groupMode}-${sectionId}`}>
                    <div className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-surface/80">
                      <button
                        type="button"
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded border border-border-warm bg-panel text-foreground"
                        onClick={() => toggleSection(sectionId)}
                        aria-expanded={expanded}
                        aria-label={`${sectionTitle} 펼치기`}
                      >
                        {expanded ? (
                          <IconChevronUp className="size-4" stroke={2} aria-hidden />
                        ) : (
                          <IconChevronDown
                            className="size-4"
                            stroke={2}
                            aria-hidden
                          />
                        )}
                      </button>
                      {groupMode === "category" ? (
                        <input
                          value={categoryDisplay}
                          onChange={(e) =>
                            setCategoryDrafts((prev) => ({
                              ...prev,
                              [sectionId]: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const draft = categoryDrafts[sectionId];
                            if (draft !== undefined) {
                              renameCategory(sectionId, draft);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[16px] font-bold text-foreground break-keep hover:border-border-warm focus:border-border-warm focus:bg-panel ${stageField}`}
                          aria-label="주제 이름"
                          placeholder="주제 이름"
                        />
                      ) : (
                        <div className="min-w-0 flex-1 break-keep">
                          <p className="text-[16px] font-bold text-foreground">
                            {sectionTitle}
                          </p>
                          {methodEntry ? (
                            <p className={`mt-0.5 ${stageWorkMicro} text-muted`}>
                              {methodEntry.summary}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <span className={`shrink-0 ${stageWorkMeta} font-medium`}>
                        {rows.length > 0
                          ? `${filledCount}/${rows.length}개`
                          : "0개"}
                      </span>
                    </div>

                    {expanded ? (
                      <div className="border-t border-border-warm bg-panel/40">
                        {rows.length === 0 ? (
                          <p
                            className={`px-3 py-4 text-center ${stageWorkDense} text-muted break-keep`}
                          >
                            {groupMode === "category"
                              ? "이 주제에 항목이 없어요. 아래에서 추가할 수 있어요."
                              : "이 방법으로 묶인 항목이 없어요. 아래에서 추가할 수 있어요."}
                          </p>
                        ) : (
                          <ToKnowRowsTable
                            rows={rows}
                            groupMode={groupMode}
                            onUpdateRow={updateRow}
                            onRemoveRow={removeRow}
                          />
                        )}
                        <div className="border-t border-border-warm px-3 py-2">
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 rounded-md border border-border-warm bg-panel px-3 py-1.5 ${stageWorkDense} font-semibold text-foreground hover:bg-surface`}
                            onClick={() =>
                              groupMode === "category"
                                ? addToKnowRow(sectionId)
                                : addRowToMethod(sectionId)
                            }
                          >
                            <IconPlus className="size-3.5" stroke={2} />
                            항목 추가
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {groupMode === "category" ? (
              <div className="mt-2 flex justify-end px-3 pb-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-md border border-border-warm bg-panel px-3 py-1.5 ${stageWorkDense} font-semibold text-foreground hover:bg-surface`}
                  onClick={addCustomCategory}
                >
                  <IconPlus className="size-3.5" stroke={2} />
                  주제 추가
                </button>
              </div>
            ) : null}
          </div>
        )}
        </>
        )}
      </section>

      <div
        className={`${stagePanel} flex flex-wrap items-center justify-between gap-3`}
      >
        <p className={stageCaption}>
          {toKnowOk
            ? "To-know 초안이 준비됐어요. 다음 화면으로 진행할 수 있어요."
            : "To-know 질문을 최소 1개는 작성해 주세요."}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <WorkspaceBackButton
            projectId={projectId}
            fallbackStageId={2}
          />
          <WorkspaceForwardButton
            pageName={STAGE4_EMPATHY_MAP_PAGE}
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
