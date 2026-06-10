import { getResearchMethodEntry } from "@/lib/stages/fieldResearch/researchMethodCatalog";
import {
  guideCategoryLabel,
  sortRowsByGuideCategory,
} from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import type { ToKnowRow } from "@/lib/stages/fieldResearch/types";

export type ToKnowExportMeta = {
  projectTitle?: string;
  problem?: string;
};

export type ToKnowExportRow = {
  category: string;
  question: string;
  infoToIdentify: string;
  methodLabel: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function methodLabel(method: ToKnowRow["method"]): string {
  if (!method) return "";
  return getResearchMethodEntry(method)?.label ?? method;
}

export function buildToKnowExportRows(table: ToKnowRow[]): ToKnowExportRow[] {
  return sortRowsByGuideCategory(table)
    .filter((r) => r.small.trim())
    .map((row) => ({
      category: guideCategoryLabel(row.mid),
      question: row.small.trim(),
      infoToIdentify: (row.note ?? "").trim(),
      methodLabel: methodLabel(row.method),
    }));
}

function exportFilename(ext: string): string {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  return `to-know-list_${stamp}.${ext}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildDocHtml(rows: ToKnowExportRow[], meta: ToKnowExportMeta): string {
  const title = meta.projectTitle?.trim() || "To-know list";
  const problem = meta.problem?.trim();
  const exportedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const bodyRows = rows
    .map((row, index) => {
      const bg = index % 2 === 0 ? "#ffffff" : "#faf9f6";
      return `<tr style="background:${bg};">
<td style="border:1px solid #d4d0c8;padding:8px 10px;vertical-align:top;width:5%;">${index + 1}</td>
<td style="border:1px solid #d4d0c8;padding:8px 10px;vertical-align:top;width:14%;">${escapeHtml(row.category)}</td>
<td style="border:1px solid #d4d0c8;padding:8px 10px;vertical-align:top;">${escapeHtml(row.question)}</td>
<td style="border:1px solid #d4d0c8;padding:8px 10px;vertical-align:top;">${escapeHtml(row.infoToIdentify || "—")}</td>
<td style="border:1px solid #d4d0c8;padding:8px 10px;vertical-align:top;width:14%;">${escapeHtml(row.methodLabel || "—")}</td>
</tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: "Pretendard", "Malgun Gothic", sans-serif; color: #2d2d2a; }
  h1 { font-size: 18pt; margin: 0 0 8px; }
  .meta { font-size: 10pt; color: #6b6a66; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  th { background: #f4f0e8; border: 1px solid #d4d0c8; padding: 8px 10px; text-align: left; }
</style>
</head>
<body>
  <h1>To-know list</h1>
  <p class="meta">
    ${escapeHtml(title)}<br />
    ${problem ? `문제점: ${escapeHtml(problem)}<br />` : ""}
  보낸 시각: ${escapeHtml(exportedAt)} · 항목 ${rows.length}개
  </p>
  <table>
    <thead>
      <tr>
        <th>No.</th>
        <th>주제</th>
        <th>핵심 질문</th>
        <th>파악하고자 하는 정보</th>
        <th>리서치 방법</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

function buildPdfHtmlElement(
  rows: ToKnowExportRow[],
  meta: ToKnowExportMeta,
): HTMLDivElement {
  const title = meta.projectTitle?.trim() || "To-know list";
  const problem = meta.problem?.trim();
  const exportedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;padding:32px;background:#fff;color:#2d2d2a;font-family:Pretendard,'Malgun Gothic',sans-serif;font-size:12px;line-height:1.5;";
  el.innerHTML = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;">To-know list</h1>
    <p style="margin:0 0 16px;font-size:11px;color:#6b6a66;">
      ${escapeHtml(title)}<br />
      ${problem ? `문제점: ${escapeHtml(problem)}<br />` : ""}
    보낸 시각: ${escapeHtml(exportedAt)} · 항목 ${rows.length}개
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr>
          <th style="border:1px solid #d4d0c8;background:#f4f0e8;padding:8px;text-align:left;width:5%;">No.</th>
          <th style="border:1px solid #d4d0c8;background:#f4f0e8;padding:8px;text-align:left;width:14%;">주제</th>
          <th style="border:1px solid #d4d0c8;background:#f4f0e8;padding:8px;text-align:left;">핵심 질문</th>
          <th style="border:1px solid #d4d0c8;background:#f4f0e8;padding:8px;text-align:left;width:28%;">파악하고자 하는 정보</th>
          <th style="border:1px solid #d4d0c8;background:#f4f0e8;padding:8px;text-align:left;width:14%;">리서치 방법</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row, i) => `<tr style="background:${i % 2 === 0 ? "#fff" : "#faf9f6"};">
              <td style="border:1px solid #d4d0c8;padding:8px;vertical-align:top;">${i + 1}</td>
              <td style="border:1px solid #d4d0c8;padding:8px;vertical-align:top;">${escapeHtml(row.category)}</td>
              <td style="border:1px solid #d4d0c8;padding:8px;vertical-align:top;">${escapeHtml(row.question)}</td>
              <td style="border:1px solid #d4d0c8;padding:8px;vertical-align:top;">${escapeHtml(row.infoToIdentify || "—")}</td>
              <td style="border:1px solid #d4d0c8;padding:8px;vertical-align:top;">${escapeHtml(row.methodLabel || "—")}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
  return el;
}

export async function exportToKnowAsPdf(
  table: ToKnowRow[],
  meta: ToKnowExportMeta,
): Promise<void> {
  const rows = buildToKnowExportRows(table);
  if (!rows.length) return;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const el = buildPdfHtmlElement(rows, meta);
  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(exportFilename("pdf"));
  } finally {
    el.remove();
  }
}

export function exportToKnowAsDoc(
  table: ToKnowRow[],
  meta: ToKnowExportMeta,
): void {
  const rows = buildToKnowExportRows(table);
  if (!rows.length) return;
  const html = buildDocHtml(rows, meta);
  const blob = new Blob([`\ufeff${html}`], {
    type: "application/msword;charset=utf-8",
  });
  triggerDownload(blob, exportFilename("doc"));
}

export async function exportToKnowAsXlsx(
  table: ToKnowRow[],
  meta: ToKnowExportMeta,
): Promise<void> {
  const rows = buildToKnowExportRows(table);
  if (!rows.length) return;

  const XLSX = await import("xlsx");
  const title = meta.projectTitle?.trim() || "To-know list";
  const problem = meta.problem?.trim();
  const exportedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const sheetRows: (string | number)[][] = [
    ["To-know list"],
    [title],
    ...(problem ? [[`문제점: ${problem}`]] : []),
    [`보낸 시각: ${exportedAt}`],
    [],
    ["No.", "주제", "핵심 질문", "파악하고자 하는 정보", "리서치 방법"],
    ...rows.map((row, i) => [
      i + 1,
      row.category,
      row.question,
      row.infoToIdentify,
      row.methodLabel,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "To-know");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  triggerDownload(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    exportFilename("xlsx"),
  );
}

export function downloadToKnowDoc(
  table: ToKnowRow[],
  meta: ToKnowExportMeta,
): boolean {
  const rows = buildToKnowExportRows(table);
  if (!rows.length) return false;
  exportToKnowAsDoc(table, meta);
  return true;
}

export async function downloadToKnowPdf(
  table: ToKnowRow[],
  meta: ToKnowExportMeta,
): Promise<boolean> {
  const rows = buildToKnowExportRows(table);
  if (!rows.length) return false;
  await exportToKnowAsPdf(table, meta);
  return true;
}

export async function downloadToKnowExcel(
  table: ToKnowRow[],
  meta: ToKnowExportMeta,
): Promise<boolean> {
  const rows = buildToKnowExportRows(table);
  if (!rows.length) return false;
  await exportToKnowAsXlsx(table, meta);
  return true;
}
