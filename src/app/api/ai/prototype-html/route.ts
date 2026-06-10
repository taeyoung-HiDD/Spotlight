import { NextResponse } from "next/server";
import { formatGroqError } from "@/lib/ai/errors";
import { resolveGroqApiKey, resolveGroqHtmlModels } from "@/lib/ai/env";
import {
  buildPrototypeHtmlPrompt,
  type PrototypeHtmlInput,
} from "@/lib/ai/prompts/prototypeHtml";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";

function extractHtml(text: string): string | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? trimmed).trim();
  if (!body.toLowerCase().includes("<!doctype") && !body.includes("<html")) {
    return null;
  }
  return body;
}

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

  if (!projectId || !conceptName) {
    return NextResponse.json(
      { error: "projectId와 conceptName이 필요합니다." },
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

  if (!resolveGroqApiKey()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY가 설정되어 있지 않습니다." },
      { status: 503 },
    );
  }

  const platformRaw = (body as { platform?: string }).platform;
  const platform: PrototypeHtmlInput["platform"] =
    platformRaw === "web" ? "web" : "mobile";

  const input: PrototypeHtmlInput = {
    conceptName,
    platform,
    conceptDescription:
      typeof (body as { conceptDescription?: string }).conceptDescription ===
      "string"
        ? (body as { conceptDescription: string }).conceptDescription
        : undefined,
    features: Array.isArray((body as { features?: unknown }).features)
      ? (body as { features: unknown[] }).features.filter(
          (f): f is string => typeof f === "string",
        )
      : undefined,
    storyboardCuts: Array.isArray(
      (body as { storyboardCuts?: unknown }).storyboardCuts,
    )
      ? (body as { storyboardCuts: unknown[] }).storyboardCuts.filter(
          (c): c is string => typeof c === "string",
        )
      : undefined,
    latentNeed:
      typeof (body as { latentNeed?: string }).latentNeed === "string"
        ? (body as { latentNeed: string }).latentNeed
        : undefined,
  };

  try {
    const result = await groqComplete(buildPrototypeHtmlPrompt(input), {
      models: resolveGroqHtmlModels(),
      temperature: 0.25,
    });

    const html = extractHtml(result.text);
    if (!html) {
      return NextResponse.json(
        { error: "시제품 HTML을 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      html,
      platform,
      confidence: "hypothesis" as const,
      source: "groq",
      model: result.model,
    });
  } catch (error) {
    console.error("[api/ai/prototype-html] Groq error:", error);
    return NextResponse.json(
      { error: formatGroqError(error) },
      { status: 502 },
    );
  }
}
