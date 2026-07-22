import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";

export interface ResearchMediaEmpathyQuadrants {
  says: string[];
  thinks: string[];
  does: string[];
  feels: string[];
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

/** 영상·음성 → 공감맵 4분면 문장 */
export async function analyzeResearchMediaToNotes({
  projectId,
  subjectId,
  media,
}: {
  projectId: string;
  subjectId: string;
  media: ResearchMediaFile & { kind: "video" | "audio" };
}): Promise<ResearchMediaEmpathyQuadrants> {
  if (!media.storagePath?.trim()) {
    throw new Error("자료 파일 경로가 없습니다.");
  }

  const res = await fetch("/api/stage4/research-media-to-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      subjectId,
      storagePath: media.storagePath,
      mimeType: media.mimeType,
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

  return {
    says,
    thinks,
    does,
    feels,
    quotes: says,
    observations: does,
  };
}
