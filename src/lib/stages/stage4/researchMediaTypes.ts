export type ResearchMediaKind = "photo" | "video" | "audio" | "document";

export interface ResearchMediaFile {
  id: string;
  kind: ResearchMediaKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  /** Supabase Storage 경로 */
  storagePath?: string;
  /** 스토리지 미사용 시(사진 폴백) */
  inlineDataUrl?: string;
}

export const RESEARCH_MEDIA_SIZE_LIMIT: Record<ResearchMediaKind, number> = {
  photo: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  document: 15 * 1024 * 1024,
};

export function detectResearchMediaKind(
  mimeType: string,
  fileName?: string,
): ResearchMediaKind | null {
  const n = (fileName ?? "").toLowerCase();
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("text/")) return "document";
  if (mimeType === "application/pdf") return "document";
  // MIME이 비정상인 경우가 있어 확장자 폴백을 둡니다.
  if (/\.(txt|md|csv|json|log|rtf)$/i.test(n)) return "document";
  if (/\.(pdf)$/i.test(n)) return "document";
  if (/\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(n)) return "document";
  return null;
}

export function researchMediaKindLabel(kind: ResearchMediaKind): string {
  if (kind === "photo") return "사진";
  if (kind === "video") return "영상";
  if (kind === "audio") return "음성";
  return "문서";
}

export function createResearchMediaFile(
  partial: Omit<ResearchMediaFile, "id" | "uploadedAt"> & { id?: string },
): ResearchMediaFile {
  return {
    id: partial.id ?? `rm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: partial.kind,
    fileName: partial.fileName,
    mimeType: partial.mimeType,
    sizeBytes: partial.sizeBytes,
    uploadedAt: new Date().toISOString(),
    storagePath: partial.storagePath,
    inlineDataUrl: partial.inlineDataUrl,
  };
}

export function normalizeResearchMediaFiles(raw: unknown): ResearchMediaFile[] {
  if (!Array.isArray(raw)) return [];
  const out: ResearchMediaFile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<ResearchMediaFile>;
    const kind = o.kind;
    if (
      kind !== "photo" &&
      kind !== "video" &&
      kind !== "audio" &&
      kind !== "document"
    ) continue;
    out.push({
      id:
        typeof o.id === "string" && o.id
          ? o.id
          : createResearchMediaFile({
              kind,
              fileName: "",
              mimeType: "",
              sizeBytes: 0,
            }).id,
      kind,
      fileName: typeof o.fileName === "string" ? o.fileName : "",
      mimeType: typeof o.mimeType === "string" ? o.mimeType : "",
      sizeBytes: typeof o.sizeBytes === "number" ? o.sizeBytes : 0,
      uploadedAt:
        typeof o.uploadedAt === "string" ? o.uploadedAt : new Date().toISOString(),
      storagePath:
        typeof o.storagePath === "string" ? o.storagePath : undefined,
      inlineDataUrl:
        typeof o.inlineDataUrl === "string" ? o.inlineDataUrl : undefined,
    });
  }
  return out.slice(0, 24);
}
