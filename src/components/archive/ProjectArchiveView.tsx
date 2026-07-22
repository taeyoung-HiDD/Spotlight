"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  archiveArtifactLabel,
  formatArchiveStageEyebrow,
} from "@/lib/artifacts/archiveArtifactLabels";
import {
  type ArchiveStageEntry,
  groupArchiveEntriesByMacro,
} from "@/lib/artifacts/buildArchiveEntries";
import { useUiLocale } from "@/hooks/useUiLocale";
import { useT } from "@/hooks/useT";
import { SIDEBAR_MACRO_GROUPS } from "@/lib/stages/sidebarNav";
import {
  stageCaption,
  stageEyebrow,
  stageLabel,
  stagePageLead,
  stagePageTitle,
  stagePanel,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface ProjectArchiveViewProps {
  projectId: string;
  entries: ArchiveStageEntry[];
}

function formatArchiveDate(iso: string, locale: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function ConfidencePill({
  confidence,
}: {
  confidence: ArchiveStageEntry["confidence"];
}) {
  const t = useT();
  const isDiscovery = confidence === "discovery";
  return (
    <span
      className={[
        "rounded px-2 py-0.5 text-[12px] font-medium",
        isDiscovery
          ? "bg-spotlight/15 text-gold"
          : "border border-border-warm bg-cream text-muted",
      ].join(" ")}
    >
      {isDiscovery
        ? t("archive.confidence.discovery")
        : t("archive.confidence.hypothesis")}
    </span>
  );
}

function ArchiveEntryCard({
  projectId,
  entry,
}: {
  projectId: string;
  entry: ArchiveStageEntry;
}) {
  const locale = useUiLocale();
  const t = useT();
  const detailHref = `/project/${projectId}/archive/${entry.stageId}`;
  const stageHref = `/project/${projectId}/stage/${entry.stageId}`;
  const title = archiveArtifactLabel(entry.stageId, locale);
  const eyebrow = formatArchiveStageEyebrow(entry.stageId, undefined, locale);

  return (
    <article className={`${stagePanel} flex flex-col gap-3`}>
      <Link href={detailHref} className="group flex flex-col gap-3 no-underline">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className={stageEyebrow}>{eyebrow}</p>
            <h3
              className={`${stageSectionTitle} mt-0.5 text-foreground group-hover:text-gold`}
            >
              {title}
            </h3>
          </div>
          <ConfidencePill confidence={entry.confidence} />
        </div>

        {entry.previewLines.length ? (
          <ul className="space-y-1.5">
            {entry.previewLines.map((line, i) => (
              <li
                key={`${entry.stageId}-line-${i}`}
                className="text-[14px] leading-relaxed text-foreground break-keep"
              >
                · <LocalizedText>{line}</LocalizedText>
              </li>
            ))}
          </ul>
        ) : (
          <p className={stageCaption}>{t("archive.noSummary")}</p>
        )}
      </Link>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border-warm pt-3">
        {entry.updatedAt ? (
          <span className="text-[12px] text-muted">
            {t("archive.savedAt", {
              date: formatArchiveDate(entry.updatedAt, locale),
            })}
          </span>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          <Link
            href={detailHref}
            className="rounded-md bg-spotlight px-3 py-1.5 text-[13px] font-semibold text-on-spotlight"
          >
            {t("archive.view")}
          </Link>
          <Link
            href={stageHref}
            className="rounded-md border border-border-warm bg-panel px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-surface"
          >
            {t("archive.editInStage")}
          </Link>
        </div>
      </div>
    </article>
  );
}

const MACRO_LABEL_KEYS: Record<
  string,
  "macro.empathize" | "macro.analyze" | "macro.ideate" | "macro.prototype" | "macro.business"
> = {
  empathize: "macro.empathize",
  analyze: "macro.analyze",
  ideate: "macro.ideate",
  prototype: "macro.prototype",
  business: "macro.business",
};

export function ProjectArchiveView({
  projectId,
  entries,
}: ProjectArchiveViewProps) {
  const [macroFilter, setMacroFilter] = useState<string>("all");
  const t = useT();

  const grouped = useMemo(() => groupArchiveEntriesByMacro(entries), [entries]);

  const filtered = useMemo(() => {
    if (macroFilter === "all") return entries;
    return grouped.get(macroFilter) ?? [];
  }, [entries, grouped, macroFilter]);

  return (
    <div className="space-y-6">
      <header className={`${stagePanel} border-spotlight/20 bg-[#FFFDF4]`}>
        <p className={stageEyebrow}>{t("archive.eyebrow")}</p>
        <h1 className={`${stagePageTitle} mt-1`}>{t("archive.title")}</h1>
        <p className={`${stagePageLead} mt-2 max-w-2xl`}>{t("archive.lead")}</p>
        <p className={`${stageLabel} mt-3 text-muted`}>
          {t("archive.count", { count: entries.length })}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMacroFilter("all")}
          className={[
            "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            macroFilter === "all"
              ? "bg-spotlight text-on-spotlight"
              : "border border-border-warm bg-panel text-foreground hover:bg-cream",
          ].join(" ")}
        >
          {t("archive.all", { count: entries.length })}
        </button>
        {SIDEBAR_MACRO_GROUPS.map((macro) => {
          const count = grouped.get(macro.id)?.length ?? 0;
          if (!count) return null;
          const labelKey = MACRO_LABEL_KEYS[macro.id];
          return (
            <button
              key={macro.id}
              type="button"
              onClick={() => setMacroFilter(macro.id)}
              className={[
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                macroFilter === macro.id
                  ? "bg-spotlight text-on-spotlight"
                  : "border border-border-warm bg-panel text-foreground hover:bg-cream",
              ].join(" ")}
            >
              {labelKey ? t(labelKey) : macro.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((entry) => (
            <ArchiveEntryCard
              key={`${entry.stageId}-${entry.artifactId}`}
              projectId={projectId}
              entry={entry}
            />
          ))}
        </div>
      ) : (
        <section className={`${stagePanel} text-center`}>
          <p className={`${stageCaption} break-keep`}>{t("archive.empty")}</p>
          <Link
            href={`/project/${projectId}/stage/1`}
            className="mt-4 inline-flex rounded-md bg-spotlight px-4 py-2 text-[14px] font-semibold text-on-spotlight"
          >
            {t("archive.startStage1")}
          </Link>
        </section>
      )}
    </div>
  );
}
