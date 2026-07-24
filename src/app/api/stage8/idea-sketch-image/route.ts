import { NextResponse } from "next/server";
import { formatImageGenerateError } from "@/lib/ai/errors";
import { buildIdeaSketchImagePrompt } from "@/lib/ai/prompts/ideaSketchImage";
import {
  generateImageDetailed,
  resolveImageCredentialsError,
  resolveImageProvider,
} from "@/lib/ai/providers/imageGenerate";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const projectId = String(
    (body as { projectId?: string }).projectId ?? "",
  ).trim();
  const title = String((body as { title?: string }).title ?? "").trim();
  const description =
    typeof (body as { description?: string }).description === "string"
      ? (body as { description: string }).description.trim()
      : "";
  const hmwText =
    typeof (body as { hmwText?: string }).hmwText === "string"
      ? (body as { hmwText: string }).hmwText.trim()
      : "";

  if (!projectId || !title || !description) {
    return NextResponse.json(
      {
        error:
          "projectId와 한 줄 제목·짧은 설명이 모두 필요합니다. 먼저 아이디어를 적어 주세요.",
      },
      { status: 400 },
    );
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  if (!resolveImageProvider()) {
    return NextResponse.json(
      { error: resolveImageCredentialsError() },
      { status: 503 },
    );
  }

  const prompt = buildIdeaSketchImagePrompt({ hmwText, title, description });

  try {
    const generated = await generateImageDetailed(prompt);
    if (!generated.ok) {
      console.error("[api/stage8/idea-sketch-image]", generated.error);
      return NextResponse.json({ error: generated.error }, { status: 502 });
    }

    return NextResponse.json({
      imageUrl: generated.dataUrl,
      confidence: "hypothesis" as const,
      source: generated.source,
      model: generated.model,
    });
  } catch (error) {
    console.error("[api/stage8/idea-sketch-image] image error:", error);
    return NextResponse.json(
      { error: formatImageGenerateError(error) },
      { status: 502 },
    );
  }
}
