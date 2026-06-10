import { createClient } from "@/lib/supabase/client";
import { fileToPersonaThumbnailDataUrl } from "@/lib/stages/stage4/compressPersonaImage";
import {
  createResearchMediaFile,
  detectResearchMediaKind,
  RESEARCH_MEDIA_SIZE_LIMIT,
  type ResearchMediaFile,
} from "@/lib/stages/stage4/researchMediaTypes";

const BUCKET = "research-media";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

export function validateResearchMediaFile(file: File): ResearchMediaFile["kind"] {
  const kind = detectResearchMediaKind(file.type);
  if (!kind) {
    throw new Error("사진·영상·음성 파일만 올릴 수 있어요.");
  }
  const limit = RESEARCH_MEDIA_SIZE_LIMIT[kind];
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    throw new Error(`${kind === "photo" ? "사진" : kind === "video" ? "영상" : "음성"}은 ${mb}MB 이하만 올릴 수 있어요.`);
  }
  return kind;
}

export async function uploadResearchMediaFile({
  projectId,
  subjectId,
  file,
}: {
  projectId: string;
  subjectId: string;
  file: File;
}): Promise<ResearchMediaFile> {
  const kind = validateResearchMediaFile(file);
  const form = new FormData();
  form.append("projectId", projectId);
  form.append("subjectId", subjectId);
  form.append("file", file);

  const res = await fetch("/api/stage4/research-media", {
    method: "POST",
    body: form,
  });
  const json = (await res.json()) as {
    media?: ResearchMediaFile;
    error?: string;
    fallback?: boolean;
  };

  if (res.ok && json.media) {
    return json.media;
  }

  if (kind === "photo" && (json.fallback || !res.ok)) {
    const inlineDataUrl =
      file.size <= 900_000
        ? await readFileAsDataUrl(file)
        : await fileToPersonaThumbnailDataUrl(file);
    return createResearchMediaFile({
      kind: "photo",
      fileName: file.name,
      mimeType: file.type || "image/jpeg",
      sizeBytes: file.size,
      inlineDataUrl,
    });
  }

  throw new Error(json.error ?? "파일을 올리지 못했습니다.");
}

export async function deleteResearchMediaFile(media: ResearchMediaFile): Promise<void> {
  if (!media.storagePath) return;
  const res = await fetch("/api/stage4/research-media", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath: media.storagePath }),
  });
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? "파일을 삭제하지 못했습니다.");
  }
}

export async function resolveResearchMediaUrl(
  media: ResearchMediaFile,
): Promise<string> {
  if (media.inlineDataUrl?.trim()) return media.inlineDataUrl;
  if (!media.storagePath?.trim()) return "";

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(media.storagePath, 3600);
  if (error || !data?.signedUrl) return "";
  return data.signedUrl;
}
