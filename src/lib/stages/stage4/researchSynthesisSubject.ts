import {
  getResearchMethodEntry,
  isStage4ResearchSynthesisMethod,
  RESEARCH_METHOD_CATALOG,
} from "@/lib/stages/fieldResearch/researchMethodCatalog";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";
import { normalizeResearchMediaFiles } from "@/lib/stages/stage4/researchMediaTypes";
import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";
import { personaLineCartoonFallbackUrl } from "@/lib/stages/stage4/personaThumbnail";

export type { ResearchMediaFile };

export interface ResearchSubject {
  id: string;
  name: string;
  context: string;
  /** 업로드 data URL 또는 AI·외부 이미지 URL */
  thumbnailUrl: string;
  researchMethodId: ResearchMethodId | "";
  /** datetime-local 값 (YYYY-MM-DDTHH:mm) */
  conductedAt: string;
  /** 리서치 사진·영상·음성 */
  mediaFiles: ResearchMediaFile[];
  sourceRespondentId?: string;
  empathyMapId?: string;
}

function migrateSubjectThumbnailUrl(
  raw: string | undefined,
  name: string,
  context: string,
): string {
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return "";
  if (url.includes("/9.x/doodle/")) {
    return personaLineCartoonFallbackUrl(name, context);
  }
  return url;
}

/** 레거시 자유 텍스트 → 카탈로그 ID */
export function guessMethodIdFromText(text: string): ResearchMethodId | "" {
  const t = text.trim().toLowerCase();
  if (!t) return "";

  for (const entry of RESEARCH_METHOD_CATALOG) {
    const label = entry.label.toLowerCase();
    if (t === entry.id || t.includes(label) || label.includes(t)) {
      return entry.id;
    }
  }

  if (t.includes("fgd") || t.includes("포커스")) return "fgd";
  if (t.includes("섀도") || t.includes("shadow")) return "shadowing";
  if (t.includes("인뎁") || t.includes("인컨텍스트") || t.includes("홈비짓")) {
    return "home_visit_in_depth";
  }
  if (t.includes("travel") || t.includes("동행")) return "shadowing";
  if (t.includes("설문")) return "survey";
  if (t.includes("데스크")) return "desk_research";

  return "other";
}

export function researchMethodLabel(id: ResearchMethodId | ""): string {
  if (!id) return "방법 미정";
  return getResearchMethodEntry(id)?.label ?? "기타";
}

export function toDatetimeLocalValue(raw: string): string {
  if (!raw.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatConductedAtLabel(value: string): string {
  if (!value.trim()) return "일시 미정";
  const local = toDatetimeLocalValue(value);
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type LegacySubject = Partial<Omit<ResearchSubject, "researchMethodId">> & {
  researchMethodId?: ResearchMethodId | "" | string;
  researchMethod?: string;
  place?: string;
  timeRange?: string;
};

export function normalizeResearchSubject(
  raw: LegacySubject,
  _index: number,
  fallbackId: string,
): ResearchSubject {
  const rawMethodId =
    typeof raw.researchMethodId === "string" ? raw.researchMethodId : "";
  let researchMethodId: ResearchMethodId | "" = rawMethodId
    ? (rawMethodId as ResearchMethodId)
    : guessMethodIdFromText(raw.researchMethod ?? "");
  if (researchMethodId && !isStage4ResearchSynthesisMethod(researchMethodId)) {
    researchMethodId = "";
  }

  const name = raw.name || "";
  const context = raw.context || "";

  return {
    id: raw.id || fallbackId,
    name,
    context,
    thumbnailUrl: migrateSubjectThumbnailUrl(raw.thumbnailUrl, name, context),
    researchMethodId,
    conductedAt: toDatetimeLocalValue(raw.conductedAt ?? ""),
    mediaFiles: normalizeResearchMediaFiles(
      (raw as { mediaFiles?: unknown }).mediaFiles,
    ),
    sourceRespondentId: raw.sourceRespondentId,
    empathyMapId: raw.empathyMapId,
  };
}
