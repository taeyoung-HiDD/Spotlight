import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";

const BUCKET = "research-media";

function extractJsonObject(text: string): unknown | null {
  const raw = text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = raw.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

interface AudioToQuoteRequest {
  projectId: string;
  subjectId: string;
  storagePath: string;
  mimeType: string;
  fileName?: string;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const { projectId, subjectId, storagePath, mimeType, fileName } =
    body as Partial<AudioToQuoteRequest>;

  const safeProjectId = String(projectId ?? "").trim();
  const safeSubjectId = String(subjectId ?? "").trim();
  const safeStoragePath = String(storagePath ?? "").trim();
  const safeMimeType = String(mimeType ?? "").trim();
  const safeFileName = typeof fileName === "string" ? fileName.trim() : "";

  if (!safeProjectId || !safeSubjectId || !safeStoragePath || !safeMimeType) {
    return NextResponse.json(
      { error: "필수 값이 없습니다." },
      { status: 400 },
    );
  }

  const access = await fetchProjectAccess(safeProjectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const pathParts = safeStoragePath.split("/");
  const storageProjectId = pathParts[0] ?? "";
  const storageSubjectId = pathParts[1] ?? "";
  if (storageProjectId !== safeProjectId || storageSubjectId !== safeSubjectId) {
    return NextResponse.json(
      { error: "storagePath가 프로젝트/조사 대상과 일치하지 않습니다." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const modelsToTry = [
    (process.env.GEMINI_AUDIO_MODEL?.trim() || "gemini-2.5-flash") as string,
    ...(process.env.GEMINI_AUDIO_MODEL_FALLBACK?.trim()
      ? [process.env.GEMINI_AUDIO_MODEL_FALLBACK.trim()]
      : []),
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(safeStoragePath, 3600);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "서명 URL을 생성하지 못했습니다." },
      { status: 500 },
    );
  }

  const audioRes = await fetch(data.signedUrl);
  if (!audioRes.ok) {
    return NextResponse.json(
      { error: "오디오 파일을 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const audioBuffer = await audioRes.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");

  const prompt = `
당신은 리서치 코치입니다.
다음 오디오에서 "조사 대상자가 직접 말한 인용/발화"만 뽑아 포스트잇용 텍스트로 변환하세요.

지침:
- 한국어로 전사하고, 전사 내용 중 질문/사회자의 말은 최대한 제거하세요.
- 각 인용은 1~2문장(짧게), 평서문 형태로 다듬되 의미는 유지하세요.
- 중복은 제거하고, 관련 없는 내용은 제외하세요.
- 결과는 반드시 JSON만 출력하세요.

출력 JSON 형식:
{
  "quotes": ["인용 1", "인용 2", "인용 3"]
}

오디오 파일명: ${safeFileName || "(unknown)"}
`.trim();

  let lastError: unknown;
  for (const modelName of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelName,
        )}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: safeMimeType, data: audioBase64 } },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT"],
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        },
      );

      if (!res.ok) {
        lastError = await res.text().catch(() => null);
        continue;
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const parts = json.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p) => p.text ?? "").join("").trim();
      const parsed = extractJsonObject(text);
      const quotesRaw =
        typeof parsed === "object" && parsed
          ? (parsed as { quotes?: unknown }).quotes
          : undefined;

      const quotes = Array.isArray(quotesRaw)
        ? quotesRaw
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, 8)
        : [];

      return NextResponse.json({
        quotes,
        source: "gemini_audio",
        model: modelName,
      });
    } catch (e) {
      lastError = e;
    }
  }

  return NextResponse.json(
    {
      error: "오디오 해석에 실패했습니다.",
      details: lastError instanceof Error ? lastError.message : String(lastError),
    },
    { status: 502 },
  );
}

