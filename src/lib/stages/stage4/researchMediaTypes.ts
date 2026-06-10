export type ResearchMediaKind = "photo" | "video" | "audio";

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
};

export function detectResearchMediaKind(mimeType: string): ResearchMediaKind | null {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
}

export function researchMediaKindLabel(kind: ResearchMediaKind): string {
  if (kind === "photo") return "사진";
  if (kind === "video") return "영상";
  return "음성";
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
    if (kind !== "photo" && kind !== "video" && kind !== "audio") continue;
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
