import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  buildMdaDeepContextPack,
  formatMdaDeepContextForPrompt,
} from "@/lib/stages/stage4/buildMdaDeepContextPack";
import {
  heuristicMultidisciplinaryAnalysis,
  MULTIDISCIPLINARY_EXPERTS,
  normalizeMultidisciplinaryAnalysis,
  type MultidisciplinaryAnalysisData,
  type MultidisciplinaryExpertId,
} from "@/lib/stages/stage4/multidisciplinaryAnalysis";
import { normalizeResearchSynthesis } from "@/lib/stages/stage4/researchSynthesisTypes";

function buildPrompt(contextBlock: string): string {
  const expertCatalog = MULTIDISCIPLINARY_EXPERTS.map(
    (e) =>
      `- id=${e.id} · ${e.labelEn} (${e.labelKo}) · lens: ${e.lens}\n  필수 근원 질문: ${e.rootProbe}`,
  ).join("\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
당신은 **다학제적 분석(Multi-disciplinary Analysis)** 퍼실리테이터입니다.
목표는 언급을 바꿔 말하는 것이 아니라, 사용자가 **표현하지 못하는 근원·배경 가설**을
근거(noteId)와 함께 드러내는 것입니다.

전문가 풀 (이 목록에서만 선택):
${expertCatalog}

절차:
1. 프로젝트 주제에 가장 적합한 전문가 **4~6명**을 selectedExpertIds에 고릅니다.
2. overview에 전체 한눈 요약(3~5문장, 한국어, 해요체)을 씁니다.
3. 조사 대상이 2명 이상이면 patterns[]에 교차 패턴 2~4개를 넣습니다.
   - kind: shared_root | diverging_background | shared_unspoken
4. bySubject에 **모든 조사 대상**을 넣고:
   A. rootReading (필수, **내부용**) — 전문가가 학습·발화에만 쓰는 레이어드 가설. 사용자 화면에는 노출하지 않음
   B. insights — 전문가 대화 (순서대로). rootReading을 자연어로 녹여 말하되, 「근원 읽기 카드」처럼 나열하지 말 것
   C. probeQuestions — 근원 파고들기 질문 3~5개

rootReading 필드 (대상자마다 가능하면 모두 채움, 내부 학습용):
- surfaceSaid: 사용자가 *말한* 문제 (언급 noteId)
- surfaceShown: 관찰로 *드러난* 행동·환경 (관찰 noteId)
- tension: 말과 행동/침묵의 모순·공백
- structuralBackground: 제도·문화·공간·기술·관계 배경 (가설)
- latentRoot: 표현·인식하지 못한 근원 욕구/두려움 (가설, 문장 끝에 (가설))
- whyUnspoken: 왜 말하기 어려운지 (가설, 문장 끝에 (가설))
각 클레임: { "id":"...", "layer":"...", "text":"...", "sourceRefs":["noteId",...], "confidence":"hypothesis" }
- sourceRefs에는 위 자료의 noteId만 사용. 근거 없으면 해당 레이어는 짧게·약하게.

insights 구성:
A. round=0: 선택 전문가 전원 — 각자 rootProbe에 답하듯 첫 해설 (재서술 금지)
B. round=1: 2~4명이 다른 레이어를 충돌·보완 (단순 「동의해요」 금지)
C. round=2(선택): 1~3명만 더 깊게
- 전문가 1인당 최대 3발화. reactsToExpertId 사용
- analysis는 한국어 4~7문장, 해요체. 「(가설)」 표기
- 언급(사용자) vs 발견(조사자 인사이트) 구분
- **금지**: Kevin 진행 멘트, 언급 문장 바꿔 말하기, 단정

probeQuestions:
- kind: tension | silence | structure | verify
- text: 사용자에게 보여줄 후속 질문
- suggestedExpertId: 풀 id

말투: overview·analysis·rootReading·patterns·probeQuestions 모두 해요체.
금지: ~습니다/~입니다 격식체.

규칙:
- JSON만 출력.
- expertId·lens·라벨은 풀과 일치.

출력 형식:
{
  "selectedExpertIds":["anthropologist","psychologist"],
  "overview":"...",
  "patterns":[
    {"id":"p1","kind":"shared_root","text":"... (가설)","subjectIds":["..."],"confidence":"hypothesis"}
  ],
  "bySubject":[
    {
      "subjectId":"...",
      "subjectName":"...",
      "rootReading":{
        "surfaceSaid":{"id":"a","layer":"surfaceSaid","text":"...","sourceRefs":["sn-..."],"confidence":"hypothesis"},
        "surfaceShown":null,
        "tension":{"id":"b","layer":"tension","text":"...","sourceRefs":["sn-..."],"confidence":"hypothesis"},
        "structuralBackground":{"id":"c","layer":"structuralBackground","text":"... (가설)","sourceRefs":["sn-..."],"confidence":"hypothesis"},
        "latentRoot":{"id":"d","layer":"latentRoot","text":"... (가설)","sourceRefs":["sn-..."],"confidence":"hypothesis"},
        "whyUnspoken":{"id":"e","layer":"whyUnspoken","text":"... (가설)","sourceRefs":["sn-..."],"confidence":"hypothesis"}
      },
      "probeQuestions":[
        {"id":"q1","kind":"tension","text":"...","suggestedExpertId":"psychologist"}
      ],
      "insights":[
        {
          "expertId":"anthropologist",
          "expertLabelEn":"Anthropologist",
          "expertLabelKo":"인류학자",
          "lens":"...",
          "round":0,
          "analysis":"..."
        }
      ]
    }
  ]
}

${contextBlock}`;
}

function parseAnalysisJson(
  text: string,
  allowedNoteIdsBySubject: Map<string, Set<string>>,
): MultidisciplinaryAnalysisData | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const normalized = normalizeMultidisciplinaryAnalysis(
      {
        ...parsed,
        generatedAt: new Date().toISOString(),
      },
      { allowedNoteIdsBySubject },
    );
    if (!normalized.bySubject.length || !normalized.overview.trim()) {
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

function ensureExpertMeta(
  data: MultidisciplinaryAnalysisData,
): MultidisciplinaryAnalysisData {
  return {
    ...data,
    patterns: Array.isArray(data.patterns) ? data.patterns : [],
    bySubject: data.bySubject.map((s) => ({
      ...s,
      followUps: Array.isArray(s.followUps) ? s.followUps : [],
      probeQuestions: Array.isArray(s.probeQuestions) ? s.probeQuestions : [],
      handedOffClaimIds: Array.isArray(s.handedOffClaimIds)
        ? s.handedOffClaimIds
        : [],
      rootReading: s.rootReading ?? null,
      insights: s.insights.map((insight) => {
        const def = MULTIDISCIPLINARY_EXPERTS.find(
          (e) => e.id === insight.expertId,
        );
        if (!def) return insight;
        return {
          ...insight,
          expertLabelEn: def.labelEn,
          expertLabelKo: def.labelKo,
          lens: def.lens,
          round: insight.round ?? 0,
        };
      }),
    })),
    selectedExpertIds: data.selectedExpertIds.filter((id) =>
      MULTIDISCIPLINARY_EXPERTS.some((e) => e.id === id),
    ) as MultidisciplinaryExpertId[],
  };
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

  const synthesis = normalizeResearchSynthesis(
    synthesisRaw as Parameters<typeof normalizeResearchSynthesis>[0],
  );

  const pack = await buildMdaDeepContextPack(projectId, synthesis);
  if (pack.subjects.length === 0) {
    return NextResponse.json(
      {
        error:
          "분석할 조사 내용이 없어요. 조사 대상의 프로필·언급·관찰·발견한 것을 먼저 적어 주세요.",
      },
      { status: 400 },
    );
  }

  const fallback = () =>
    ensureExpertMeta(
      heuristicMultidisciplinaryAnalysis({
        problem: pack.problem,
        subjects: pack.subjects.map((s) => ({
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          quotes: s.quotes.map((n) => ({ id: n.id, text: n.text })),
          observations: s.observations.map((n) => ({ id: n.id, text: n.text })),
          findings: s.findings.map((n) => ({ id: n.id, text: n.text })),
        })),
      }),
    );

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      analysis: fallback(),
      source: "heuristic",
    });
  }

  try {
    const result = await groqComplete(
      buildPrompt(formatMdaDeepContextForPrompt(pack)),
      {
        models: resolveGroqTextModels(),
        temperature: 0.5,
        jsonMode: true,
      },
    );
    const parsed = parseAnalysisJson(
      result.text,
      pack.allowedNoteIdsBySubject,
    );
    if (!parsed) {
      return NextResponse.json({
        analysis: fallback(),
        source: "heuristic",
      });
    }
    return NextResponse.json({
      analysis: ensureExpertMeta(parsed),
      source: "groq",
      model: result.model,
    });
  } catch (e) {
    return NextResponse.json({
      analysis: fallback(),
      source: "heuristic",
      details: e instanceof Error ? e.message : String(e),
    });
  }
}
