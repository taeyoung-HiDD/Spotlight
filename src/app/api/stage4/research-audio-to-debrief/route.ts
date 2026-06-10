import { NextResponse } from "next/server";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  extractJsonObject,
  fetchStorageFileBase64,
  geminiGenerateWithParts,
  resolveGeminiAudioModels,
} from "@/lib/stages/stage4/geminiResearchAudio";
import { TEAM_DEBRIEF_SUBJECT_ID } from "@/lib/stages/stage4/teamDebriefConstants";

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
  const storagePath = String(
    (body as { storagePath?: string }).storagePath ?? "",
  ).trim();
  const mimeType = String(
    (body as { mimeType?: string }).mimeType ?? "",
  ).trim();
  const fileName =
    typeof (body as { fileName?: string }).fileName === "string"
      ? (body as { fileName: string }).fileName.trim()
      : "";

  if (!projectId || !storagePath || !mimeType) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const parts = storagePath.split("/");
  if (
    parts[0] !== projectId ||
    parts[1] !== TEAM_DEBRIEF_SUBJECT_ID
  ) {
    return NextResponse.json({ error: "잘못된 경로입니다." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const audio = await fetchStorageFileBase64(storagePath);
  if (!audio) {
    return NextResponse.json(
      { error: "음성 파일을 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const prompt = `
당신은 리서치 팀 디브리핑 기록 보조입니다.
다음 오디오는 세션 직후 팀이 나눈 디브리핑 대화입니다.

지침:
- 한국어로 전사·요약해 팀 디브리핑 메모 형태로 정리하세요.
- 섹션: 의외였던 점 / 핵심 인용·관찰 / 다음에 확인할 것 (각 1~4개 불릿, · 로 시작)
- 질문·잡담은 줄이고, 팀이 공유한 인사이트 중심으로 쓰세요.
- 결과는 반드시 JSON만 출력하세요.

출력 JSON:
{
  "summary": "팀 디브리핑 메모 본문 (plain text, 불릿 포함)"
}

파일명: ${fileName || "(unknown)"}
`.trim();

  try {
    const result = await geminiGenerateWithParts({
      apiKey,
      models: resolveGeminiAudioModels(),
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType || audio.mimeType, data: audio.base64 } },
      ],
      jsonMode: true,
      temperature: 0.2,
    });

    if (!result) {
      return NextResponse.json(
        { error: "음성 정리에 실패했습니다." },
        { status: 502 },
      );
    }

    const parsed = extractJsonObject(result.text);
    const summary =
      typeof parsed === "object" &&
      parsed &&
      typeof (parsed as { summary?: unknown }).summary === "string"
        ? (parsed as { summary: string }).summary.trim()
        : result.text.trim();

    if (!summary) {
      return NextResponse.json(
        { error: "정리 결과가 비어 있습니다." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      summary,
      source: "gemini_audio",
      model: result.model,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "음성 정리에 실패했습니다.",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
