import { NextResponse } from "next/server";
import { resolveGeminiTextModels } from "@/lib/ai/env";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import { buildSynthesisDebriefContext } from "@/lib/stages/stage4/buildSynthesisDebriefContext";
import {
  fetchStorageFileBase64,
  geminiGenerateWithParts,
  resolveGeminiAudioModels,
} from "@/lib/stages/stage4/geminiResearchAudio";
import { normalizeResearchSynthesis } from "@/lib/stages/stage4/researchSynthesisTypes";
import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";

const MAX_PHOTOS = 6;
const MAX_AUDIO_CLIPS = 4;

function collectMediaFiles(
  synthesis: ReturnType<typeof normalizeResearchSynthesis>,
): ResearchMediaFile[] {
  const out: ResearchMediaFile[] = [...synthesis.teamDebriefMediaFiles];
  for (const subject of synthesis.subjects) {
    out.push(...subject.mediaFiles);
  }
  return out;
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
  const synthesisRaw = (body as { synthesis?: unknown }).synthesis;

  if (!projectId || !synthesisRaw) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY가 설정되어 있지 않습니다." },
      { status: 500 },
    );
  }

  const synthesis = normalizeResearchSynthesis(
    synthesisRaw as Parameters<typeof normalizeResearchSynthesis>[0],
  );
  const contextText = buildSynthesisDebriefContext(synthesis);

  const parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }> = [
    {
      text: `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래 자료(포스트잇·리서치 미디어·팀 메모)를 바탕으로 **팀 디브리핑**을 해 주세요.
Kevin 코치 말투로, 문단마다 빈 줄을 넣어 읽기 쉽게 씁니다.

포함할 내용:
1. 전체 한눈 요약 (2~3문장)
2. 조사 대상별 핵심 (언급·관찰·발견한 것 구분)
3. 공통 패턴과 차이
4. 의외였던 점 — 추론은 (가설)로 표시
5. 다음에 현장에서 확인할 것

규칙:
- 사용자 발화(언급)와 조사자 인사이트(발견한 것)를 구분합니다.
- 사진이 첨부되면 장면·맥락 단서를 짧게 짚습니다.
- 영상·음성 파일명은 자료 목록을 참고해 언급합니다.
- 결론처럼 단정하지 않고, 가설·관찰 중심으로 말합니다.

${contextText}`,
    },
  ];

  const allMedia = collectMediaFiles(synthesis);
  let photoCount = 0;
  let audioCount = 0;

  for (const media of allMedia) {
    if (!media.storagePath?.trim()) continue;

    if (media.kind === "photo" && photoCount < MAX_PHOTOS) {
      const file = await fetchStorageFileBase64(media.storagePath);
      if (file) {
        parts.push({
          inlineData: {
            mimeType: media.mimeType || file.mimeType || "image/jpeg",
            data: file.base64,
          },
        });
        parts.push({
          text: `[첨부 사진] ${media.fileName || media.id}`,
        });
        photoCount += 1;
      }
      continue;
    }

    if (media.kind === "audio" && audioCount < MAX_AUDIO_CLIPS) {
      const file = await fetchStorageFileBase64(media.storagePath);
      if (file) {
        parts.push({
          text: `[첨부 음성 전사 요청] ${media.fileName || media.id}`,
        });
        parts.push({
          inlineData: {
            mimeType: media.mimeType || file.mimeType || "audio/mpeg",
            data: file.base64,
          },
        });
        audioCount += 1;
      }
    }
  }

  const models = [
    ...resolveGeminiTextModels(),
    ...resolveGeminiAudioModels(),
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  try {
    const result = await geminiGenerateWithParts({
      apiKey,
      models,
      parts,
      temperature: 0.35,
    });

    if (!result?.text.trim()) {
      return NextResponse.json(
        { error: "디브리핑 응답을 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      debrief: result.text.trim(),
      model: result.model,
      source: "gemini",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: "디브리핑 요청에 실패했습니다.",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 },
    );
  }
}
