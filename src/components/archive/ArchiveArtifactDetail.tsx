"use client";

import Link from "next/link";
import {
  archiveArtifactLabel,
  formatArchiveStageEyebrow,
} from "@/lib/artifacts/archiveArtifactLabels";
import type { ArchiveStageEntry } from "@/lib/artifacts/buildArchiveEntries";
import { ArchiveStageContent } from "@/components/archive/ArchiveStageContent";
import { useUiLocale } from "@/hooks/useUiLocale";
import { useT } from "@/hooks/useT";
import {
  stageCaption,
  stageEyebrow,
  stagePageTitle,
  stagePanel,
  stageWorkMicro,
} from "@/lib/stages/ui";

interface ArchiveArtifactDetailProps {
  projectId: string;
  entry: ArchiveStageEntry;
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

export function ArchiveArtifactDetail({
  projectId,
  entry,
}: ArchiveArtifactDetailProps) {
  const locale = useUiLocale();
  const t = useT();
  const stageHref = `/project/${projectId}/stage/${entry.stageId}`;
  const archiveHref = `/project/${projectId}/archive`;

  return (
    <div className="space-y-4">
      <header className={`${stagePanel} border-spotlight/20 bg-[#FFFDF4]`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={archiveHref}
            className={`${stageWorkMicro} font-semibold text-muted hover:text-foreground`}
          >
            {t("archive.back")}
          </Link>
          <Link
            href={stageHref}
            className="rounded-md border border-border-warm bg-panel px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-surface"
          >
            {t("archive.editInStage")}
          </Link>
        </div>
        <p className={stageEyebrow}>
          {formatArchiveStageEyebrow(entry.stageId, undefined, locale)}
        </p>
        <h1 className={`${stagePageTitle} mt-1`}>
          {archiveArtifactLabel(entry.stageId, locale)}
        </h1>
        {entry.updatedAt ? (
          <p className={`${stageCaption} mt-2`}>
            {t("archive.savedAt", {
              date: formatArchiveDate(entry.updatedAt, locale),
            })}
          </p>
        ) : null}
      </header>

      <ArchiveStageContent projectId={projectId} stageId={entry.stageId} />

      <footer
        className={`${stagePanel} flex flex-wrap items-center justify-between gap-3`}
      >
        <Link
          href={archiveHref}
          className={`${stageWorkMicro} font-semibold text-muted hover:text-foreground`}
        >
          {t("archive.backList")}
        </Link>
        <Link
          href={stageHref}
          className="rounded-md bg-spotlight px-3 py-1.5 text-[13px] font-semibold text-on-spotlight"
        >
          {t("archive.editInStage")}
        </Link>
      </footer>
    </div>
  );
}
