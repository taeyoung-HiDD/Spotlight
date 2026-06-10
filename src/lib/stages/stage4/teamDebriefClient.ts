import {
  deleteResearchMediaFile,
  uploadResearchMediaFile,
} from "@/lib/stages/stage4/researchMediaClient";
import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";
import { TEAM_DEBRIEF_SUBJECT_ID } from "@/lib/stages/stage4/teamDebriefConstants";

export async function uploadTeamDebriefAudio({
  projectId,
  file,
}: {
  projectId: string;
  file: File;
}): Promise<ResearchMediaFile> {
  return uploadResearchMediaFile({
    projectId,
    subjectId: TEAM_DEBRIEF_SUBJECT_ID,
    file,
  });
}

export async function summarizeTeamDebriefAudio(
  media: ResearchMediaFile,
  projectId: string,
): Promise<string> {
  if (!media.storagePath?.trim()) {
    throw new Error("음성 파일 경로가 없습니다.");
  }

  const res = await fetch("/api/stage4/research-audio-to-debrief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      storagePath: media.storagePath,
      mimeType: media.mimeType,
      fileName: media.fileName,
    }),
  });

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(json?.error ?? "음성 정리에 실패했습니다.");
  }

  const json = (await res.json()) as { summary?: string };
  if (!json.summary?.trim()) {
    throw new Error("정리 결과가 비어 있습니다.");
  }
  return json.summary.trim();
}

export async function removeTeamDebriefAudio(
  media: ResearchMediaFile,
): Promise<void> {
  await deleteResearchMediaFile(media);
}
