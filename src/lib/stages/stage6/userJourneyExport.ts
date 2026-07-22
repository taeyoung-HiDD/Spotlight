import {
  JOURNEY_BOARD_CONTENT_ROWS,
  JOURNEY_BOARD_ROW_LABELS,
} from "@/lib/stages/stage6/userJourneyBoardLabels";
import { buildJourneyEmotionPoints } from "@/lib/stages/stage6/journeyEmotionFromPain";
import {
  isJourneyAiZone,
  resolveStepAiEntries,
  resolveStepZoneItems,
  stepHasAssignedContent,
} from "@/lib/stages/stage6/journeyStepZones";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import type {
  JourneyMapItem,
  JourneyMapItemKind,
  JourneyMapStep,
  JourneyStepZone,
  UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";

export type UserJourneyExportMeta = {
  projectTitle?: string;
};

const KIND_LABEL: Record<JourneyMapItemKind, string> = {
  quote: "언급",
  observation: "관찰",
  latent_need: "잠재 니즈",
};

const STEP_HEADER_COLORS = [
  "#FFF59D",
  "#FFE082",
  "#FFCC80",
  "#FFAB91",
  "#CE93D8",
];

const ZONE_BG: Record<JourneyStepZone, string> = {
  behavior: "#FFFDE7",
  touchpoint: "#E3F2FD",
  feeling: "#FFF3E0",
  pain_point: "#FFEBEE",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportFilename(ext: string, projectTitle?: string): string {
  const base =
    projectTitle?.trim().replace(/[\\/:*?"<>|]+/g, "").slice(0, 40) ||
    "사용자-여정-지도";
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}-여정지도-${stamp}.${ext}`;
}

function formatExportedAt(): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
}

function itemChipHtml(item: JourneyMapItem): string {
  const kind = KIND_LABEL[item.kind];
  return `<div style="display:inline-block;max-width:100%;margin:0 0 4px;padding:4px 6px;border:1px solid #d4d0c8;border-radius:4px;background:#fff;font-size:10px;line-height:1.35;vertical-align:top;box-sizing:border-box;">
    <div style="font-weight:700;opacity:0.7;margin-bottom:2px;">${escapeHtml(kind)}</div>
    <div style="word-break:keep-all;overflow-wrap:anywhere;">${escapeHtml(item.text.trim())}</div>
  </div>`;
}

function zoneCellHtml(
  step: JourneyMapStep,
  zone: JourneyStepZone,
  itemsById: UserJourneyMapData["itemsById"],
): string {
  const ids = resolveStepZoneItems(step, itemsById)[zone];
  const items = ids
    .map((id) => itemsById[id])
    .filter((item): item is JourneyMapItem => Boolean(item?.text.trim()));
  const chips = items.map(itemChipHtml).join("");
  const aiEntries = isJourneyAiZone(zone)
    ? resolveStepAiEntries(step, zone).filter((entry) => entry.trim())
    : [];
  const aiText = aiEntries.length
    ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #e8e4dc;">${aiEntries
        .map(
          (entry) =>
            `<div style="margin:0 0 4px;padding:4px 6px;border:1px solid #d4d0c8;border-radius:4px;background:#fff;font-size:10px;line-height:1.4;word-break:keep-all;overflow-wrap:anywhere;">${escapeHtml(entry)}</div>`,
        )
        .join("")}</div>`
    : "";
  const empty =
    !chips && !aiText
      ? `<span style="color:#9a958c;font-size:10px;">—</span>`
      : "";
  return `<td style="border:1px solid #d4d0c8;padding:6px;vertical-align:top;background:${ZONE_BG[zone]};min-width:120px;">${chips}${aiText}${empty}</td>`;
}

function emotionRowHtml(
  steps: JourneyMapStep[],
  itemsById: UserJourneyMapData["itemsById"],
): string {
  const points = buildJourneyEmotionPoints(steps, itemsById);
  const cells = points
    .map((point) => {
      const barH = Math.round(Math.abs(point.score) * 28);
      const isUp = point.score >= 0;
      return `<td style="border:1px solid #d4d0c8;padding:8px 6px;vertical-align:middle;background:${ZONE_BG.feeling};text-align:center;min-width:120px;">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:64px;gap:4px;">
          ${isUp ? `<div style="width:3px;height:${barH}px;background:#E91E8C;border-radius:2px;"></div>` : `<div style="height:${28 - barH}px;"></div>`}
          <div style="font-size:20px;line-height:1;">${point.emoji}</div>
          ${!isUp ? `<div style="width:3px;height:${barH}px;background:#E91E8C;border-radius:2px;"></div>` : `<div style="height:${28 - barH}px;"></div>`}
          <div style="font-size:9px;color:#7a756c;word-break:keep-all;">${escapeHtml(point.ariaLabel)}</div>
        </div>
      </td>`;
    })
    .join("");
  return `<tr>
      <th style="border:1px solid #d4d0c8;padding:8px 6px;background:#f7f4ee;text-align:left;vertical-align:top;width:88px;font-size:11px;color:#1c1a16;">
        <div style="font-weight:700;">${escapeHtml(JOURNEY_BOARD_ROW_LABELS.feeling)}</div>
        <div style="margin-top:2px;font-size:9px;font-weight:500;color:#7a756c;">${escapeHtml(JOURNEY_BOARD_ROW_LABELS.feelingHint)}</div>
      </th>
      ${cells}
    </tr>`;
}

function personaTableHtml(
  label: string,
  context: string,
  expectations: string,
  steps: JourneyMapStep[],
  itemsById: UserJourneyMapData["itemsById"],
): string {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const headerCells = sorted
    .map((step, index) => {
      const bg = STEP_HEADER_COLORS[index % STEP_HEADER_COLORS.length]!;
      const title = step.label.trim() || `단계 ${index + 1}`;
      return `<th style="border:1px solid #d4d0c8;padding:8px 6px;background:${bg};color:#1c1a16;font-size:12px;font-weight:700;text-align:center;min-width:120px;">${escapeHtml(title)}</th>`;
    })
    .join("");

  const bodyRows = JOURNEY_BOARD_CONTENT_ROWS.map((zone) => {
    const rowLabel = JOURNEY_BOARD_ROW_LABELS[zone];
    const hintKey = `${zone}Hint` as keyof typeof JOURNEY_BOARD_ROW_LABELS;
    const hint = JOURNEY_BOARD_ROW_LABELS[hintKey];
    if (zone === "feeling") {
      return emotionRowHtml(sorted, itemsById);
    }
    const cells = sorted
      .map((step) => zoneCellHtml(step, zone, itemsById))
      .join("");
    return `<tr>
      <th style="border:1px solid #d4d0c8;padding:8px 6px;background:#f7f4ee;text-align:left;vertical-align:top;width:88px;font-size:11px;color:#1c1a16;">
        <div style="font-weight:700;">${escapeHtml(rowLabel)}</div>
        <div style="margin-top:2px;font-size:9px;font-weight:500;color:#7a756c;">${escapeHtml(hint)}</div>
      </th>
      ${cells}
    </tr>`;
  }).join("");

  return `
    <section style="margin-bottom:28px;page-break-inside:avoid;">
      <h2 style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1c1a16;">${escapeHtml(label)}</h2>
      ${
        context.trim()
          ? `<p style="margin:0 0 6px;font-size:11px;line-height:1.5;color:#5c574f;word-break:keep-all;">${escapeHtml(context.trim())}</p>`
          : ""
      }
      ${
        expectations.trim()
          ? `<p style="margin:0 0 10px;font-size:11px;line-height:1.5;color:#5c574f;word-break:keep-all;"><strong>기대 사항</strong> · ${escapeHtml(expectations.trim())}</p>`
          : ""
      }
      <table style="border-collapse:collapse;width:100%;table-layout:fixed;font-family:Pretendard,'Malgun Gothic',sans-serif;">
        <thead>
          <tr>
            <th style="border:1px solid #d4d0c8;padding:8px 6px;background:#f4f0e8;text-align:left;font-size:11px;width:88px;">${escapeHtml(JOURNEY_BOARD_ROW_LABELS.step)}</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </section>
  `;
}

/** 보낼 내용이 있는 페르소나만 */
export function personasWithJourneyContent(
  data: UserJourneyMapData,
): Array<{ subjectId: string; label: string; index: number }> {
  return data.subjects
    .map((subject, index) => ({ subject, index }))
    .filter(({ subject }) => {
      const persona = data.personas[subject.id];
      if (!persona) return false;
      return persona.steps.some((step) =>
        stepHasAssignedContent(step, data.itemsById),
      );
    })
    .map(({ subject, index }) => ({
      subjectId: subject.id,
      label: subjectDisplayLabel(subject.name, index),
      index,
    }));
}

function buildExportBodyHtml(
  data: UserJourneyMapData,
  meta: UserJourneyExportMeta,
): string {
  const title = meta.projectTitle?.trim() || "사용자 여정 지도";
  const exportedAt = formatExportedAt();
  const sections = personasWithJourneyContent(data)
    .map(({ subjectId, label, index }) => {
      const subject = data.subjects.find((s) => s.id === subjectId);
      const persona = data.personas[subjectId];
      if (!subject || !persona) return "";
      return personaTableHtml(
        label || subjectDisplayLabel(subject.name, index),
        subject.context,
        persona.expectations,
        persona.steps,
        data.itemsById,
      );
    })
    .filter(Boolean)
    .join("");

  return `
    <header style="margin-bottom:20px;border-bottom:2px solid #e8e4dc;padding-bottom:12px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.04em;color:#8a847a;text-transform:uppercase;">DT Coach · 6단계</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1c1a16;word-break:keep-all;">${escapeHtml(title)}</h1>
      <p style="margin:0;font-size:11px;color:#7a756c;">User Journey Map · 보낸 시각 ${escapeHtml(exportedAt)}</p>
    </header>
    ${sections}
  `;
}

function maxStepCount(data: UserJourneyMapData): number {
  return Math.max(
    1,
    ...personasWithJourneyContent(data).map(({ subjectId }) => {
      const persona = data.personas[subjectId];
      return persona?.steps.length ?? 1;
    }),
  );
}

export async function exportUserJourneyAsPdf(
  data: UserJourneyMapData,
  meta: UserJourneyExportMeta = {},
): Promise<void> {
  if (personasWithJourneyContent(data).length === 0) return;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const stepCount = maxStepCount(data);
  const widthPx = Math.max(1100, 120 + stepCount * 160);

  const el = document.createElement("div");
  el.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${widthPx}px`,
    "padding:36px 40px",
    "background:#ffffff",
    "color:#1c1a16",
    "font-family:Pretendard,'Malgun Gothic',sans-serif",
    "box-sizing:border-box",
  ].join(";");
  el.innerHTML = buildExportBodyHtml(data, meta);
  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // 가로(landscape) 비율 보장 — 세로면 교체
    if (pdf.internal.pageSize.getWidth() < pdf.internal.pageSize.getHeight()) {
      pdf.deletePage(1);
      pdf.addPage("a4", "landscape");
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    while (heightLeft > 0.5) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage("a4", "landscape");
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(exportFilename("pdf", meta.projectTitle));
  } finally {
    el.remove();
  }
}

export async function downloadUserJourneyPdf(
  data: UserJourneyMapData,
  meta: UserJourneyExportMeta = {},
): Promise<boolean> {
  if (personasWithJourneyContent(data).length === 0) return false;
  await exportUserJourneyAsPdf(data, meta);
  return true;
}
