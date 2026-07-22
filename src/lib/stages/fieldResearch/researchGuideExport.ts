import {
  STAGE3_RESEARCH_GUIDE_INTERVIEW,
  STAGE3_RESEARCH_GUIDE_INTRO,
  STAGE3_RESEARCH_GUIDE_SHADOWING,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import {
  buildToKnowExportRows,
  type ToKnowExportRow,
} from "@/lib/stages/fieldResearch/toKnowExport";
import { toDirectInterviewQuestion } from "@/lib/stages/fieldResearch/researchGuideQuestions";
import type { ToKnowRow } from "@/lib/stages/fieldResearch/types";

export type ResearchGuideExportMeta = {
  projectTitle?: string;
  problem?: string;
  coreQuestion?: string;
  methodLabels?: string[];
  participantCount?: number;
  segmentLabels?: string[];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveProblem(meta: ResearchGuideExportMeta): string {
  return meta.coreQuestion?.trim() || meta.problem?.trim() || "";
}

/** 조사 대상자(infoCategory)별로 To-know 문항을 묶음 */
function groupBySubject(
  rows: ToKnowExportRow[],
): { subject: string; rows: ToKnowExportRow[] }[] {
  const buckets = new Map<string, ToKnowExportRow[]>();
  const order: string[] = [];
  for (const row of rows) {
    const subject = row.infoCategory.trim() || "대상자 미지정";
    if (!buckets.has(subject)) {
      buckets.set(subject, []);
      order.push(subject);
    }
    buckets.get(subject)!.push(row);
  }
  return order.map((subject) => ({ subject, rows: buckets.get(subject)! }));
}

function exportFilename(ext: string): string {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
  return `리서치-진행-가이드_${stamp}.${ext}`;
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

/**
 * 인쇄용 리서치 진행 가이드 본문 HTML.
 * Word(blob)·PDF(html2canvas) 양쪽에서 공유하는 인라인 스타일 마크업.
 */
function buildGuideBodyHtml(
  meta: ResearchGuideExportMeta,
  toKnowRows: ToKnowExportRow[],
): string {
  const problem = resolveProblem(meta);
  const methods = (meta.methodLabels ?? []).filter(Boolean);
  const segments = (meta.segmentLabels ?? []).filter(Boolean);
  const exportedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const sectionTitle = (text: string) =>
    `<h2 style="margin:26px 0 10px;font-size:15pt;font-weight:700;color:#1f1e1c;border-bottom:2px solid #F4C430;padding-bottom:6px;">${escapeHtml(text)}</h2>`;

  const metaBox = `
    <div style="margin:0 0 18px;padding:14px 16px;background:#faf7ef;border:1px solid #e6e0d2;border-radius:8px;font-size:10.5pt;line-height:1.7;color:#4a463f;">
      ${meta.projectTitle ? `<div><b>프로젝트</b> · ${escapeHtml(meta.projectTitle)}</div>` : ""}
      ${problem ? `<div><b>풀고자 하는 문제</b> · ${escapeHtml(problem)}</div>` : ""}
      ${methods.length ? `<div><b>조사 방법</b> · ${escapeHtml(methods.join(" · "))}</div>` : ""}
      ${meta.participantCount ? `<div><b>조사 인원</b> · ${meta.participantCount}명${segments.length ? ` (${escapeHtml(segments.join(" · "))})` : ""}</div>` : ""}
      <div style="color:#8a8578;">출력 시각 · ${escapeHtml(exportedAt)}</div>
    </div>`;

  const intro = `<p style="margin:0 0 4px;font-size:11pt;line-height:1.7;color:#4a463f;">${escapeHtml(STAGE3_RESEARCH_GUIDE_INTRO)}</p>`;

  const shadowing = `
    ${sectionTitle(`동행 관찰 진행 원칙`)}
    <p style="margin:0 0 10px;font-size:10.5pt;line-height:1.7;color:#6b665c;">${escapeHtml(STAGE3_RESEARCH_GUIDE_SHADOWING.description)}</p>
    <ul style="margin:0;padding-left:18px;font-size:10.5pt;line-height:1.7;color:#3a372f;">
      ${STAGE3_RESEARCH_GUIDE_SHADOWING.principles
        .map(
          (p) =>
            `<li style="margin-bottom:6px;"><b>${escapeHtml(p.title)}</b><br/><span style="color:#6b665c;">${escapeHtml(p.body)}</span></li>`,
        )
        .join("")}
    </ul>`;

  const interviewTips = `
    ${sectionTitle(`1:1 인터뷰 진행 원칙`)}
    <p style="margin:0 0 10px;font-size:10.5pt;line-height:1.7;color:#6b665c;">${escapeHtml(STAGE3_RESEARCH_GUIDE_INTERVIEW.description)}</p>
    <ul style="margin:0 0 10px;padding-left:18px;font-size:10.5pt;line-height:1.7;color:#3a372f;">
      ${STAGE3_RESEARCH_GUIDE_INTERVIEW.tips
        .map((t) => `<li style="margin-bottom:5px;">${escapeHtml(t)}</li>`)
        .join("")}
    </ul>
    <p style="margin:0;padding:10px 12px;background:#fef9e9;border:1px solid #f2e3a8;border-radius:8px;font-size:10pt;line-height:1.6;color:#7a5b00;">${escapeHtml(STAGE3_RESEARCH_GUIDE_INTERVIEW.flowTip)}</p>`;

  const interviewFlow = `
    ${sectionTitle(`1:1 인터뷰 질문 흐름 (약 40분)`)}
    ${STAGE3_RESEARCH_GUIDE_INTERVIEW.stages
      .map(
        (stage) => `
      <div style="margin-bottom:14px;padding:12px 14px;border:1px solid #e6e0d2;border-radius:8px;">
        <div style="font-size:11pt;font-weight:700;color:#1f1e1c;">${escapeHtml(stage.title)}</div>
        <div style="margin-top:3px;font-size:9.5pt;color:#b58900;">목적 · ${escapeHtml(stage.goal)}</div>
        <ul style="margin:8px 0 0;padding-left:18px;font-size:10.5pt;line-height:1.7;color:#3a372f;">
          ${stage.scripts.map((s) => `<li style="margin-bottom:4px;">“${escapeHtml(s)}”</li>`).join("")}
        </ul>
      </div>`,
      )
      .join("")}`;

  const groups = groupBySubject(toKnowRows);
  const toKnowSection = groups.length
    ? `
    ${sectionTitle(`대상자에게 바로 물어볼 인터뷰 질문 (To-know)`)}
    <p style="margin:0 0 12px;font-size:10pt;line-height:1.6;color:#6b665c;">현장에서 위 흐름을 따라가며, 아래 질문을 대상자에게 그대로 물어보세요. 대상자별로 꼭 확인할 핵심 질문입니다.</p>
    ${groups
      .map(
        (group) => `
      <div style="margin-bottom:14px;">
        <div style="display:inline-block;margin-bottom:6px;padding:3px 10px;background:#eef6f0;border:1px solid #cfe6d6;border-radius:999px;font-size:10pt;font-weight:700;color:#2e6b45;">${escapeHtml(group.subject)}</div>
        <table style="width:100%;border-collapse:collapse;font-size:10pt;">
          <thead>
            <tr>
              <th style="width:6%;border:1px solid #d4d0c8;background:#f4f0e8;padding:6px 8px;text-align:left;">No.</th>
              <th style="width:16%;border:1px solid #d4d0c8;background:#f4f0e8;padding:6px 8px;text-align:left;">주제</th>
              <th style="border:1px solid #d4d0c8;background:#f4f0e8;padding:6px 8px;text-align:left;">대상자에게 물어볼 질문</th>
              <th style="width:18%;border:1px solid #d4d0c8;background:#f4f0e8;padding:6px 8px;text-align:left;">방법</th>
            </tr>
          </thead>
          <tbody>
            ${group.rows
              .map(
                (row, i) => `
              <tr style="background:${i % 2 === 0 ? "#ffffff" : "#faf9f6"};">
                <td style="border:1px solid #d4d0c8;padding:6px 8px;vertical-align:top;">${i + 1}</td>
                <td style="border:1px solid #d4d0c8;padding:6px 8px;vertical-align:top;">${escapeHtml(row.category)}</td>
                <td style="border:1px solid #d4d0c8;padding:6px 8px;vertical-align:top;">${escapeHtml(toDirectInterviewQuestion(row.category, group.subject, row.infoToIdentify))}</td>
                <td style="border:1px solid #d4d0c8;padding:6px 8px;vertical-align:top;">${escapeHtml(row.methodLabel || "—")}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`,
      )
      .join("")}`
    : "";

  return `
    <h1 style="margin:0 0 4px;font-size:20pt;font-weight:700;color:#1f1e1c;">사용자 리서치 진행 가이드</h1>
    <p style="margin:0 0 14px;font-size:10pt;color:#8a8578;">현장에서 프린트해 참고하는 리서치 진행 안내서</p>
    ${metaBox}
    ${intro}
    ${shadowing}
    ${interviewTips}
    ${interviewFlow}
    ${toKnowSection}
  `;
}

export function exportResearchGuideAsDoc(
  table: ToKnowRow[],
  meta: ResearchGuideExportMeta,
): void {
  const toKnowRows = buildToKnowExportRows(table, resolveProblem(meta));
  const body = buildGuideBodyHtml(meta, toKnowRows);
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="ko">
<head>
<meta charset="utf-8" />
<title>사용자 리서치 진행 가이드</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: "Pretendard", "Malgun Gothic", sans-serif; color: #2d2d2a; }
</style>
</head>
<body>${body}</body>
</html>`;
  const blob = new Blob([`\ufeff${html}`], {
    type: "application/msword;charset=utf-8",
  });
  triggerDownload(blob, exportFilename("doc"));
}

export async function exportResearchGuideAsPdf(
  table: ToKnowRow[],
  meta: ResearchGuideExportMeta,
): Promise<void> {
  const toKnowRows = buildToKnowExportRows(table, resolveProblem(meta));
  const body = buildGuideBodyHtml(meta, toKnowRows);

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;padding:40px;background:#fff;color:#2d2d2a;font-family:Pretendard,'Malgun Gothic',sans-serif;";
  el.innerHTML = body;
  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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

export function downloadResearchGuideDoc(
  table: ToKnowRow[],
  meta: ResearchGuideExportMeta,
): void {
  exportResearchGuideAsDoc(table, meta);
}

export async function downloadResearchGuidePdf(
  table: ToKnowRow[],
  meta: ResearchGuideExportMeta,
): Promise<void> {
  await exportResearchGuideAsPdf(table, meta);
}
