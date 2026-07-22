import { NextResponse } from "next/server";
import { resolveGeminiApiKey, resolveGeminiAudioModels } from "@/lib/ai/env";
import { createClient } from "@/lib/supabase/server";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";

const BUCKET = "research-media";

function extractJsonObject(text: string): unknown | null {
  const raw = text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeSentences(raw: unknown, max = 12): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

interface MediaToNotesRequest {
  projectId: string;
  subjectId: string;
  storagePath: string;
  mimeType: string;
  fileName?: string;
  kind: "video" | "audio";
}

function buildPrompt({
  kind,
  fileName,
  doesOnly = false,
}: {
  kind: "video" | "audio";
  fileName: string;
  doesOnly?: boolean;
}): string {
  if (kind === "video" && doesOnly) {
    return `
당신은 디자인씽킹 리서치 코치입니다.
첨부된 **영상**만 보고, 조사 대상자(화면에 주로 나오는 사람)의 **행동**만 정리하세요.

규칙:
- 한국어로 작성합니다.
- **does**에만 채웁니다. says·thinks·feels는 빈 배열 [].
- 한 항목 = 관찰 가능한 행동 하나 (예: "스마트폰 화면을 아래로 스크롤한다", "음료를 한 모금 마신 뒤 한숨을 쉰다").
- 제스처·시선·자세·도구 사용·이동·상호작용을 사실로 적습니다.
- 질문자·촬영자 행동은 제외합니다.
- 해석·감정 단정·추측은 넣지 않습니다.
- **4~10개**를 목표로 합니다.
- JSON만 출력합니다.

{
  "says": [],
  "thinks": [],
  "does": ["행동 1", "행동 2"],
  "feels": []
}

자료 파일명: ${fileName || "(unknown)"}
`.trim();
  }

  if (kind === "video") {
    return `
당신은 디자인씽킹 리서치 코치입니다.
첨부된 **영상**을 분석해 조사 대상자의 공감맵 문장을 만드세요.

핵심 목표: 화면에서 보이는 **리서치 대상자의 행동**을 텍스트로 뽑아 **does(행동함)** 포스트잇으로 정리합니다.

네 분면:
1) says(말함): 대상자가 직접 한 말. 질문자/사회자 말은 제외.
2) thinks(생각함): 말·맥락에서 드러난 판단·믿음. 추측이면 끝에 (가설).
3) does(행동함): **가장 중요**. 대상자의 관찰 가능한 행동·제스처·시선·자세·도구 사용·이동·주변과의 상호작용. 해석이 아닌 사실. **4~10개**.
4) feels(느낌): 표정·목소리 톤 등 보이는/들리는 감정 단서만.

작성 규칙:
- 한국어. 포스트잇 하나 = 사실 하나. 한 문장(최대 두 문장).
- does 예: "장바구니에 제품을 넣었다가 다시 빼낸다", "라벨을 가까이 들여다본다".
- 질문자·촬영자 행동은 does에 넣지 않습니다.
- JSON만 출력합니다.

{
  "says": ["말함 1"],
  "thinks": ["생각 1"],
  "does": ["행동 1", "행동 2"],
  "feels": ["느낌 1"]
}

자료 파일명: ${fileName || "(unknown)"}
`.trim();
  }

  return `
당신은 디자인씽킹 리서치 코치입니다.
다음 음성 자료를 분석해, 조사 대상자의 공감맵 4분면에 넣을 사실을 정리하세요.

네 분면:
1) says(말함): 조사 대상자가 직접 말한 인용·발화. 질문자/사회자 말은 제외.
2) thinks(생각함): 말·맥락에서 드러난 판단·믿음·가정. 추측이면 끝에 (가설).
3) does(행동함): 발화 중 드러난 행동 단서(머뭇거림·반복·중단 등)의 사실적 기록.
4) feels(느낌): 말투·한숨·감정 변화 등 들리는 감정 단서.

작성 규칙:
- 한국어. 포스트잇 하나 = 사실 하나. 한 문장(최대 두 문장).
- does는 해석이 아니라 들린 사실.
- JSON만 출력합니다.

{
  "says": ["말함 1"],
  "thinks": ["생각 1"],
  "does": ["행동 1"],
  "feels": ["느낌 1"]
}

자료 파일명: ${fileName || "(unknown)"}
`.trim();
}

async function generateQuadrants({
  apiKey,
  models,
  mimeType,
  mediaBase64,
  prompt,
}: {
  apiKey: string;
  models: string[];
  mimeType: string;
  mediaBase64: string;
  prompt: string;
}): Promise<{
  says: string[];
  thinks: string[];
  does: string[];
  feels: string[];
  model: string;
} | null> {
  let lastError: unknown;

  for (const modelName of models) {
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
                  { inlineData: { mimeType, data: mediaBase64 } },
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

      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      const parsed = extractJsonObject(text) as
        | {
            says?: unknown;
            thinks?: unknown;
            does?: unknown;
            feels?: unknown;
            quotes?: unknown;
            observations?: unknown;
          }
        | null;

      if (!parsed) {
        lastError = "JSON 파싱 실패";
        continue;
      }

      return {
        says: normalizeSentences(parsed.says ?? parsed.quotes),
        thinks: normalizeSentences(parsed.thinks),
        does: normalizeSentences(parsed.does ?? parsed.observations),
        feels: normalizeSentences(parsed.feels),
        model: modelName,
      };
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  return null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const { projectId, subjectId, storagePath, mimeType, fileName, kind } =
    body as Partial<MediaToNotesRequest>;

  const safeProjectId = String(projectId ?? "").trim();
  const safeSubjectId = String(subjectId ?? "").trim();
  const safeStoragePath = String(storagePath ?? "").trim();
  const safeMimeType = String(mimeType ?? "").trim();
  const safeFileName = typeof fileName === "string" ? fileName.trim() : "";
  const safeKind = kind === "video" ? "video" : "audio";

  if (!safeProjectId || !safeSubjectId || !safeStoragePath || !safeMimeType) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
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
  if (
    storageProjectId !== safeProjectId ||
    storageSubjectId !== safeSubjectId
  ) {
    return NextResponse.json(
      { error: "storagePath가 프로젝트/조사 대상과 일치하지 않습니다." },
      { status: 400 },
    );
  }

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const modelsToTry = resolveGeminiAudioModels();

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

  const mediaRes = await fetch(data.signedUrl);
  if (!mediaRes.ok) {
    return NextResponse.json(
      { error: "자료 파일을 가져오지 못했습니다." },
      { status: 502 },
    );
  }

  const mediaBuffer = await mediaRes.arrayBuffer();
  const mediaBase64 = Buffer.from(mediaBuffer).toString("base64");

  try {
    let result = await generateQuadrants({
      apiKey,
      models: modelsToTry,
      mimeType: safeMimeType,
      mediaBase64,
      prompt: buildPrompt({
        kind: safeKind,
        fileName: safeFileName,
      }),
    });

    // 영상인데 행동함이 비면, 행동 전용 프롬프트로 한 번 더 시도
    if (safeKind === "video" && result && result.does.length === 0) {
      const fallback = await generateQuadrants({
        apiKey,
        models: modelsToTry,
        mimeType: safeMimeType,
        mediaBase64,
        prompt: buildPrompt({
          kind: "video",
          fileName: safeFileName,
          doesOnly: true,
        }),
      });
      if (fallback?.does.length) {
        result = {
          ...result,
          does: fallback.does,
          model: fallback.model,
        };
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: "자료 분석에 실패했습니다." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      says: result.says,
      thinks: result.thinks,
      does: result.does,
      feels: result.feels,
      quotes: result.says,
      observations: result.does,
      source: "gemini_media",
      model: result.model,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "자료 분석에 실패했습니다.",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
