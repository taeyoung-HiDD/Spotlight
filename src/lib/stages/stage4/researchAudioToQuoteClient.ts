import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";

export async function transcribeResearchAudioToQuotes({
  projectId,
  subjectId,
  audio,
}: {
  projectId: string;
  subjectId: string;
  audio: ResearchMediaFile & { kind: "audio" };
}): Promise<{ quotes: string[] }> {
  if (!audio.storagePath?.trim()) {
    throw new Error("오디오 파일 경로가 없습니다.");
  }

  const res = await fetch("/api/stage4/research-audio-to-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      subjectId,
      storagePath: audio.storagePath,
      mimeType: audio.mimeType,
      fileName: audio.fileName,
    }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(json?.error ?? "오디오 해석에 실패했습니다.");
  }

  const json = (await res.json()) as { quotes?: unknown };
  const quotes = Array.isArray(json.quotes)
    ? json.quotes
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

  return { quotes };
}

