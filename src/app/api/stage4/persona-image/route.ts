import { NextResponse } from "next/server";
import {
  generateImage,
  resolveImageProvider,
} from "@/lib/ai/providers/imageGenerate";
import {
  buildPersonaCartoonImagePrompt,
  personaLineCartoonFallbackUrl,
} from "@/lib/stages/stage4/personaThumbnail";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const name =
    typeof (body as { name?: string }).name === "string"
      ? (body as { name: string }).name.trim().slice(0, 40)
      : "";
  const context =
    typeof (body as { context?: string }).context === "string"
      ? (body as { context: string }).context.trim().slice(0, 2000)
      : "";

  const fallbackUrl = personaLineCartoonFallbackUrl(name, context);

  if (!resolveImageProvider()) {
    return NextResponse.json({
      imageUrl: fallbackUrl,
      source: "fallback",
      message: "이미지 API 키가 없어 기본 라인드로잉 아바타를 붙였어요.",
    });
  }

  const prompt = buildPersonaCartoonImagePrompt(name, context);
  const generated = await generateImage(prompt);

  if (generated) {
    return NextResponse.json({
      imageUrl: generated.dataUrl,
      source: generated.source,
      model: generated.model,
    });
  }

  return NextResponse.json({
    imageUrl: fallbackUrl,
    source: "fallback",
    message: "AI 생성에 실패해 기본 라인드로잉 아바타를 붙였어요.",
  });
}
