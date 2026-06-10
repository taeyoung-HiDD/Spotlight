"use client";

import { IconChevronDown } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import type { ContextualDimensionResearchMap } from "@/lib/stages/stage2/contextualDimensionResearch";
import {
  CONTEXTUAL_BOTTOM_ZONE,
  CONTEXTUAL_TOP_ZONES,
  type ContextualCanvasZone,
} from "@/lib/stages/stage2/contextualCanvasLayout";
import {
  CONTEXTUAL_CELL_BODY,
  CONTEXTUAL_CELL_BODY_SURFACE,
  CONTEXTUAL_CELL_HEADER_BAR,
  CONTEXTUAL_CELL_PREVIEW,
  CONTEXTUAL_CELL_SUBTLE,
  CONTEXTUAL_CELL_TITLE,
  CONTEXTUAL_CELL_TITLE_LG,
  CONTEXTUAL_CELL_TITLE_SM,
  CONTEXTUAL_ZONE_HEADER_LEAD,
  CONTEXTUAL_ZONE_HEADER_TITLE,
  zoneChrome,
} from "@/lib/stages/stage2/contextualCanvasZoneStyle";
import {
  getDimensionDef,
  type ContextualDimensionAnswers,
  type ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import {
  getPeopleSectionVariant,
  parseProfileItem,
  parseRoleItem,
  PEOPLE_PROFILE_CARD_CLASS,
  PEOPLE_ROLE_CARD_CLASS,
  PEOPLE_SECTION_HEADER_CLASS,
} from "@/lib/stages/stage2/peopleFindingsPresentation";
import {
  isPeopleContextualDimension,
  parsePeopleFindingsSections,
  peopleCollapsedPreview,
} from "@/lib/stages/stage2/peopleContextualResearch";
import {
  CONTEXTUAL_RESEARCH_CAPTION,
  CONTEXTUAL_RESEARCH_TITLE,
  formatGuidelinesCompact,
} from "@/lib/stages/stage2/contextualResearchGuidelines";
import { formatSelectedDimensionsLabel } from "@/lib/stages/stage2/selectContextualDimensions";
import {
  filterDeclarativeBullets,
  sanitizeContextualFindings,
} from "@/lib/stages/stage2/sanitizeContextualFindings";
import {
  stageCaption,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface ContextualResearchCanvasProps {
  startingPoint: string;
  selectedDimensions: ContextualDimensionId[];
  answers: ContextualDimensionAnswers;
  research: ContextualDimensionResearchMap;
  autoResearchLoading?: boolean;
}

function collapsedPreview({
  selected,
  loading,
  error,
  hasItems,
  hasFindings,
  itemCount,
}: {
  selected: boolean;
  loading?: boolean;
  error?: boolean;
  hasItems: boolean;
  hasFindings: boolean;
  itemCount: number;
}): string {
  if (!selected) return "선정 제외 · 펼쳐서 안내 보기";
  if (loading) return "사전 조사 중…";
  if (error) return "조사 미완료 · 펼쳐서 보기";
  if (hasItems) return `${itemCount}건 · 펼쳐서 보기`;
  if (hasFindings) return "사전 조사 결과 · 펼쳐서 보기";
  return "펼쳐서 보기";
}

function PeopleProfileCard({ item }: { item: string }) {
  const parsed = parseProfileItem(item);

  return (
    <li className={PEOPLE_PROFILE_CARD_CLASS}>
      <p
        className={`text-[15px] font-bold leading-snug break-keep sm:text-[16px] ${CONTEXTUAL_CELL_BODY}`}
      >
        {parsed.segment}
      </p>
      {parsed.identity ? (
        <p
          className={`mt-0.5 text-[12px] font-semibold break-keep sm:text-[12.5px] ${CONTEXTUAL_CELL_PREVIEW}`}
        >
          {parsed.identity}
        </p>
      ) : null}
      <p
        className={`mt-1.5 text-[13px] leading-[1.65] break-keep sm:text-[14px] ${CONTEXTUAL_CELL_SUBTLE}`}
      >
        {parsed.body}
      </p>
    </li>
  );
}

function PeopleRoleCard({ item }: { item: string }) {
  const { subject, detail } = parseRoleItem(item);

  return (
    <li className={PEOPLE_ROLE_CARD_CLASS}>
      {subject ? (
        <p
          className={`text-[13px] font-semibold break-keep sm:text-[14px] ${CONTEXTUAL_CELL_BODY}`}
        >
          {subject}
        </p>
      ) : null}
      <p
        className={[
          "text-[12.5px] leading-[1.65] break-keep sm:text-[13px]",
          subject ? `mt-1 ${CONTEXTUAL_CELL_SUBTLE}` : CONTEXTUAL_CELL_BODY,
        ].join(" ")}
      >
        {detail}
      </p>
    </li>
  );
}

function PeopleFindingsBody({ findings }: { findings: string }) {
  const sections = parsePeopleFindingsSections(findings);

  if (!sections.length) {
    return (
      <p
        className={`whitespace-pre-wrap text-[14px] leading-relaxed sm:text-[15px] ${CONTEXTUAL_CELL_BODY}`}
      >
        {findings}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const variant = getPeopleSectionVariant(section.title);
        const isProfile = variant === "profile";

        return (
          <div key={section.title}>
            <p className={PEOPLE_SECTION_HEADER_CLASS[variant]}>
              {section.title}
            </p>
            <ul
              className={[
                "mt-2 space-y-2",
                isProfile ? "space-y-2.5" : "space-y-1.5",
              ].join(" ")}
            >
              {section.items.map((item) =>
                isProfile ? (
                  <PeopleProfileCard key={item} item={item} />
                ) : (
                  <PeopleRoleCard key={item} item={item} />
                ),
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function CanvasCell({
  dimensionId,
  label,
  selected,
  expanded,
  onToggle,
  loading,
  error,
  errorMessage,
  items,
  findings,
}: {
  dimensionId: ContextualDimensionId;
  label: string;
  selected: boolean;
  expanded: boolean;
  onToggle: (id: ContextualDimensionId) => void;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  items: string[];
  findings?: string;
}) {
  const isPeople = isPeopleContextualDimension(dimensionId);
  const displayFindings = findings ? sanitizeContextualFindings(findings) : "";
  const displayItems = filterDeclarativeBullets(items);
  const hasFindings = Boolean(displayFindings.trim());
  const hasItems = displayItems.length > 0;
  const peopleSections = isPeople
    ? parsePeopleFindingsSections(displayFindings)
    : [];
  const preview =
    isPeople && hasFindings && selected && !loading && !error
      ? peopleCollapsedPreview(displayFindings)
      : collapsedPreview({
          selected,
          loading,
          error,
          hasItems,
          hasFindings,
          itemCount: displayItems.length,
        });

  return (
    <div className="flex flex-col overflow-hidden rounded-md">
      <button
        type="button"
        className={`flex w-full items-start gap-2 px-2.5 py-2.5 text-left sm:px-3 sm:py-3 ${CONTEXTUAL_CELL_HEADER_BAR}`}
        onClick={() => onToggle(dimensionId)}
        aria-expanded={expanded}
        aria-label={expanded ? `${label} 접기` : `${label} 펼치기`}
      >
        <div className="min-w-0 flex-1">
          <h3
            className={[
              CONTEXTUAL_CELL_TITLE,
              isPeople ? CONTEXTUAL_CELL_TITLE_LG : CONTEXTUAL_CELL_TITLE_SM,
            ].join(" ")}
          >
            {label}
          </h3>
          {!expanded ? (
            <p className={`mt-0.5 ${CONTEXTUAL_CELL_PREVIEW}`}>{preview}</p>
          ) : null}
        </div>
        <span
          className={[
            "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded border border-white/20 bg-white/10 text-zone-cell-fg",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        >
          <IconChevronDown className="size-3.5" stroke={2} />
        </span>
      </button>

      {expanded ? (
        <div
          className={`px-2.5 pb-3 pt-2 sm:px-3 ${CONTEXTUAL_CELL_BODY_SURFACE}`}
        >
          {!selected ? (
            <p className={CONTEXTUAL_CELL_SUBTLE}>
              이번 문제점 기준 자동 선정에서 제외된 영역이에요.
            </p>
          ) : loading ? (
            <p className={`italic ${CONTEXTUAL_CELL_SUBTLE}`}>사전 조사 중…</p>
          ) : error ? (
            <p className={CONTEXTUAL_CELL_SUBTLE}>
              조사를 완료하지 못했어요. 코치에게 다시 요청해 주세요.
              {errorMessage ? (
                <span className={`mt-1 block text-[11.5px] ${CONTEXTUAL_CELL_SUBTLE}`}>
                  {errorMessage}
                </span>
              ) : null}
            </p>
          ) : isPeople && (peopleSections.length > 0 || hasFindings) ? (
            <div className="max-h-80 overflow-y-auto sm:max-h-96">
              <PeopleFindingsBody findings={displayFindings} />
            </div>
          ) : hasItems ? (
            <ul
              className={`max-h-48 list-inside list-disc space-y-0.5 overflow-y-auto ${CONTEXTUAL_CELL_BODY}`}
            >
              {displayItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : hasFindings ? (
            <div className="max-h-48 overflow-y-auto">
              <p className={`whitespace-pre-wrap ${CONTEXTUAL_CELL_BODY}`}>
                {displayFindings}
              </p>
            </div>
          ) : (
            <p className={CONTEXTUAL_CELL_SUBTLE}>—</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CanvasZone({
  zone,
  selectedSet,
  expandedIds,
  onToggle,
  answers,
  research,
  className = "",
}: {
  zone: ContextualCanvasZone;
  selectedSet: Set<ContextualDimensionId>;
  expandedIds: Set<ContextualDimensionId>;
  onToggle: (id: ContextualDimensionId) => void;
  answers: ContextualDimensionAnswers;
  research: ContextualDimensionResearchMap;
  className?: string;
}) {
  const isBottom = zone.placement === "bottom";
  const chrome = zoneChrome(zone.id);

  return (
    <section
      className={[
        "flex min-w-0 flex-col",
        chrome.sectionShell,
        isBottom ? "col-span-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={`shrink-0 ${chrome.sectionHeader}`}>
        <h3 className={CONTEXTUAL_ZONE_HEADER_TITLE}>{zone.title}</h3>
        <p className={CONTEXTUAL_ZONE_HEADER_LEAD}>{zone.lead}</p>
      </header>

      <div
        className={[
          "grid gap-2 p-2",
          isBottom
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : "grid-cols-1",
        ].join(" ")}
      >
        {zone.dimensions.map((id) => {
          const def = getDimensionDef(id);
          const selected = selectedSet.has(id);
          const entry = research[id];

          return (
            <CanvasCell
              key={id}
              dimensionId={id}
              label={def.label}
              selected={selected}
              expanded={expandedIds.has(id)}
              onToggle={onToggle}
              loading={selected && entry?.status === "loading"}
              error={selected && entry?.status === "error"}
              errorMessage={entry?.errorMessage}
              items={answers[id] ?? []}
              findings={entry?.findings}
            />
          );
        })}
      </div>
    </section>
  );
}

export function ContextualResearchCanvas({
  startingPoint,
  selectedDimensions,
  answers,
  research,
  autoResearchLoading = false,
}: ContextualResearchCanvasProps) {
  const problem = startingPoint.trim();
  const selectedSet = useMemo(
    () => new Set(selectedDimensions),
    [selectedDimensions],
  );
  const selectedLabel = formatSelectedDimensionsLabel(selectedDimensions);
  const [expandedIds, setExpandedIds] = useState<Set<ContextualDimensionId>>(
    () => new Set(),
  );

  const toggleExpanded = useCallback((id: ContextualDimensionId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <section className={stagePanel}>
      <h2 className={stageSectionTitle}>
        맥락 이해하기 · {CONTEXTUAL_RESEARCH_TITLE}
      </h2>
      <p className={`mt-1 ${stageSectionLead}`}>{CONTEXTUAL_RESEARCH_CAPTION}</p>
      <p className={`mt-2 text-[14px] leading-relaxed text-muted break-keep`}>
        {formatGuidelinesCompact()}
      </p>
      <p className={`mt-2 ${stageSectionLead}`}>
        1단계 문제점에 맞춰 {selectedDimensions.length}개 항목(
        {selectedLabel})을 4단계 가이드에 따라 자동 선정·조사했습니다. 항목을
        눌러 펼친 뒤 내용을 확인하고, 보완은 오른쪽 코치에게 말씀해 주세요.
      </p>
      <p className={`mt-2 ${stageCaption}`}>
        ※ AI·2차 자료 기반 가설입니다. 현장·사용자 조사로 검증하세요.
      </p>

      {autoResearchLoading ? (
        <p className={`mt-3 ${stageCaption}`}>사전 조사 진행 중…</p>
      ) : null}

      <div className="mt-4 rounded-xl border border-border-warm bg-highlight/35 px-4 py-3.5 sm:px-5 sm:py-4">
        <p className="text-[11.5px] font-semibold tracking-wide text-gold uppercase">
          1단계 문제점
        </p>
        <p className="mt-1.5 text-[17.5px] font-semibold leading-snug text-foreground break-keep sm:text-[18px]">
          {problem || (
            <span className="font-normal text-muted">
              단계 1에서 문제점을 입력해 주세요
            </span>
          )}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[min(100%,32rem)] space-y-3 sm:min-w-[36rem]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONTEXTUAL_TOP_ZONES.map((zone) => (
              <CanvasZone
                key={zone.id}
                zone={zone}
                selectedSet={selectedSet}
                expandedIds={expandedIds}
                onToggle={toggleExpanded}
                answers={answers}
                research={research}
              />
            ))}
          </div>
          <CanvasZone
            zone={CONTEXTUAL_BOTTOM_ZONE}
            selectedSet={selectedSet}
            expandedIds={expandedIds}
            onToggle={toggleExpanded}
            answers={answers}
            research={research}
          />
        </div>
      </div>

      {selectedDimensions.length === 0 && !autoResearchLoading ? (
        <p className={`mt-3 ${stageCaption}`}>
          선정된 영역이 없습니다. 문제점을 확인한 뒤 다시 시도해 주세요.
        </p>
      ) : null}
    </section>
  );
}
