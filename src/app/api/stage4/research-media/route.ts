import { NextResponse } from "next/server";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  createResearchMediaFile,
  detectResearchMediaKind,
  RESEARCH_MEDIA_SIZE_LIMIT,
} from "@/lib/stages/stage4/researchMediaTypes";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "research-media";

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-가-힣]/g, "_").slice(0, 120) || "file";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const projectId = String(form.get("projectId") ?? "").trim();
  const subjectId = String(form.get("subjectId") ?? "").trim();
  const file = form.get("file");

  if (!projectId || !subjectId || !(file instanceof File)) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json({ error: "프로젝트 접근 권한이 없습니다." }, { status: 403 });
  }

  const kind = detectResearchMediaKind(file.type);
  if (!kind) {
    return NextResponse.json(
      { error: "사진·영상·음성 파일만 올릴 수 있어요." },
      { status: 400 },
    );
  }

  if (file.size > RESEARCH_MEDIA_SIZE_LIMIT[kind]) {
    return NextResponse.json({ error: "파일 크기가 제한을 넘었어요." }, { status: 400 });
  }

  const supabase = await createClient();
  const fileId = crypto.randomUUID();
  const storagePath = `${projectId}/${subjectId}/${fileId}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        fallback: kind === "photo",
      },
      { status: kind === "photo" ? 503 : 500 },
    );
  }

  const media = createResearchMediaFile({
    id: fileId,
    kind,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    storagePath,
  });

  return NextResponse.json({ media });
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const storagePath =
    typeof (body as { storagePath?: string }).storagePath === "string"
      ? (body as { storagePath: string }).storagePath.trim()
      : "";
  if (!storagePath) {
    return NextResponse.json({ error: "storagePath가 필요합니다." }, { status: 400 });
  }

  const projectId = storagePath.split("/")[0];
  if (!projectId) {
    return NextResponse.json({ error: "잘못된 경로입니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json({ error: "프로젝트 접근 권한이 없습니다." }, { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
