import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";

export interface ResearchMediaEmpathyQuadrants {
  says: string[];
  thinks: string[];
  does: string[];
  feels: string[];
  /** (audio 전용) 음성을 텍스트로 전사한 전체 기록 */
  transcript?: string;
  /** @deprecated 호환 — says와 동일 */
  quotes: string[];
  /** @deprecated 호환 — does와 동일 */
  observations: string[];
}

function toList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

export type AnalyzableResearchMedia = ResearchMediaFile & {
  kind: "video" | "audio" | "document";
};

export function isAnalyzableResearchMedia(
  media: ResearchMediaFile,
): media is AnalyzableResearchMedia {
  if (media.kind === "video" || media.kind === "audio") {
    return Boolean(media.storagePath?.trim());
  }
  if (media.kind === "document") {
    return Boolean(media.storagePath?.trim() || media.inlineDataUrl?.trim());
  }
  return false;
}

/** 영상·음성·문서 → 공감맵 4분면 문장 */
export async function analyzeResearchMediaToNotes({
  projectId,
  subjectId,
  media,
}: {
  projectId: string;
  subjectId: string;
  media: AnalyzableResearchMedia;
}): Promise<ResearchMediaEmpathyQuadrants> {
  if (!isAnalyzableResearchMedia(media)) {
    throw new Error("분석할 수 있는 자료가 아니에요.");
  }

  const res = await fetch("/api/stage4/research-media-to-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      subjectId,
      storagePath: media.storagePath,
      inlineDataUrl: media.inlineDataUrl,
      mimeType: media.mimeType || "application/octet-stream",
      fileName: media.fileName,
      kind: media.kind,
    }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(json?.error ?? "자료 분석에 실패했습니다.");
  }

  const json = (await res.json()) as Record<string, unknown>;
  const says = toList(json.says ?? json.quotes);
  const does = toList(json.does ?? json.observations);
  const thinks = toList(json.thinks);
  const feels = toList(json.feels);
  const transcript =
    typeof json.transcript === "string" ? json.transcript.trim() : undefined;

  return {
    says,
    thinks,
    does,
    feels,
    transcript,
    quotes: says,
    observations: does,
  };
}
