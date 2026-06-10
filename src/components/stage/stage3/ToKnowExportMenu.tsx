"use client";

import {
  IconFileSpreadsheet,
  IconFileText,
  IconFileTypePdf,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";
import {
  buildToKnowExportRows,
  downloadToKnowDoc,
  downloadToKnowExcel,
  downloadToKnowPdf,
  type ToKnowExportMeta,
} from "@/lib/stages/fieldResearch/toKnowExport";
import type { ToKnowRow } from "@/lib/stages/fieldResearch/types";
import { stageBtnSecondary, stageCaption } from "@/lib/stages/ui";

interface ToKnowExportMenuProps {
  table: ToKnowRow[];
  meta?: ToKnowExportMeta;
  disabled?: boolean;
}

export function ToKnowExportMenu({
  table,
  meta = {},
  disabled = false,
}: ToKnowExportMenuProps) {
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportableCount = buildToKnowExportRows(table).length;
  const blocked = disabled || exportableCount === 0;

  const runExport = useCallback(
    async (kind: "doc" | "pdf" | "xlsx") => {
      if (blocked) return;
      setError(null);
      try {
        if (kind === "doc") {
          const ok = downloadToKnowDoc(table, meta);
          if (!ok) setError("보낼 To-know 질문이 없어요.");
          return;
        }
        setExporting(kind);
        const ok =
          kind === "pdf"
            ? await downloadToKnowPdf(table, meta)
            : await downloadToKnowExcel(table, meta);
        if (!ok) setError("보낼 To-know 질문이 없어요.");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "파일을보내지 못했습니다.",
        );
      } finally {
        setExporting(null);
      }
    },
    [blocked, meta, table],
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span className={`mr-1 hidden sm:inline ${stageCaption}`}>보내기</span>
        <button
          type="button"
          className={`${stageBtnSecondary} inline-flex items-center gap-1 px-2.5 py-1.5`}
          disabled={blocked || exporting !== null}
          onClick={() => void runExport("xlsx")}
          aria-label="Excel로보내기"
        >
          <IconFileSpreadsheet className="size-3.5" stroke={2} aria-hidden />
          {exporting === "xlsx" ? "Excel…" : "Excel"}
        </button>
        <button
          type="button"
          className={`${stageBtnSecondary} inline-flex items-center gap-1 px-2.5 py-1.5`}
          disabled={blocked || exporting !== null}
          onClick={() => void runExport("pdf")}
          aria-label="PDF로보내기"
        >
          <IconFileTypePdf className="size-3.5" stroke={2} aria-hidden />
          {exporting === "pdf" ? "PDF…" : "PDF"}
        </button>
        <button
          type="button"
          className={`${stageBtnSecondary} inline-flex items-center gap-1 px-2.5 py-1.5`}
          disabled={blocked || exporting !== null}
          onClick={() => void runExport("doc")}
          aria-label="Word 문서로보내기"
        >
          <IconFileText className="size-3.5" stroke={2} aria-hidden />
          Word
        </button>
      </div>
      {error ? (
        <p className="text-[12.5px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
