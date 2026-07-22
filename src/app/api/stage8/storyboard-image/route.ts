import { NextResponse } from "next/server";
import { formatImageGenerateError } from "@/lib/ai/errors";
import { buildStoryboardImagePrompt } from "@/lib/ai/prompts/storyboardImage";
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
  const conceptName = String(
    (body as { conceptName?: string }).conceptName ?? "",
  ).trim();
  const cutCaption = String(
    (body as { cutCaption?: string }).cutCaption ?? "",
  ).trim();
  const cutIndex = Number((body as { cutIndex?: number }).cutIndex);

  if (!projectId || !conceptName || !cutCaption || !cutIndex || cutIndex < 1) {
    return NextResponse.json(
      { error: "projectId, conceptName, cutCaption, cutIndex(1+)가 필요합니다." },
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

  const totalCuts = Number((body as { totalCuts?: number }).totalCuts) || 5;
  const prompt = buildStoryboardImagePrompt({
    cutIndex,
    totalCuts,
    conceptName,
    cutCaption,
    userNeed:
      typeof (body as { userNeed?: string }).userNeed === "string"
        ? (body as { userNeed: string }).userNeed
        : undefined,
    personaContext:
      typeof (body as { personaContext?: string }).personaContext === "string"
        ? (body as { personaContext: string }).personaContext
        : undefined,
    isFinale: Boolean((body as { isFinale?: boolean }).isFinale),
  });

  try {
    const generated = await generateImageDetailed(prompt);
    if (!generated.ok) {
      return NextResponse.json({ error: generated.error }, { status: 502 });
    }

    return NextResponse.json({
      imageUrl: generated.dataUrl,
      cutIndex,
      confidence: "hypothesis" as const,
      source: generated.source,
      model: generated.model,
    });
  } catch (error) {
    console.error("[api/stage8/storyboard-image] image error:", error);
    return NextResponse.json(
      { error: formatImageGenerateError(error) },
      { status: 502 },
    );
  }
}
