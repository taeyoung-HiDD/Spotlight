import { NextResponse } from "next/server";
import { resolveGeminiApiKey, resolveGeminiTextModels } from "@/lib/ai/env";
import { geminiChat } from "@/lib/ai/providers/geminiText";
import {
  webSearchMany,
  type WebSearchResult,
} from "@/lib/ai/providers/webSearch";
import {
  applyPrePmfOverviewPatch,
  formatFollowupConversationHistory,
  prePmfOverviewPatchHasChanges,
  serializePrePmfOverviewForFollowup,
} from "@/lib/stages/stage2/prePmfFollowupMerge";
import {
  normalizePrePmfOverview,
  PRE_PMF_WRITING_TONE_RULE,
  type PrePmfOverviewData,
} from "@/lib/stages/stage2/prePmfOverview";

type FollowupAction =
  | "chat_only"
  | "research"
  | "apply"
  | "research_and_apply";

function groundingBlock(label: string, results: WebSearchResult[]): string {
  if (!results.length) {
    return `[${label}] (검색 결과 없음)`;
  }
  return `[${label}]\n${results
    .slice(0, 8)
    .map(
      (r, i) =>
        `(${i + 1}) ${r.title}\n${r.content.slice(0, 450)}\n출처: ${r.url || "(URL 없음)"}`,
    )
    .join("\n\n")}`;
}

function formatSourcesFooter(results: WebSearchResult[]): string {
  const urls = results
    .filter((r) => r.url.trim())
    .slice(0, 5)
    .map((r) => `· ${r.title}: ${r.url}`);
  if (!urls.length) return "";
  return `\n\n참고 출처\n${urls.join("\n")}`;
}

function buildIntentPrompt(
  problem: string,
  overviewJson: string,
  userRequest: string,
  conversation: string,
): string {
  return `
사용자가 사전 조사(Pre-PMF) 결과를 보고 코치에게 메시지를 보냈습니다.
다음 중 어떤 처리가 필요한지 판단하세요.

문제점·초기 아이디어: ${problem.slice(0, 2000) || "(미입력)"}

현재 왼쪽 작업 영역(사전 조사 정본) JSON:
${overviewJson}

최근 코치 대화:
${conversation}

사용자 메시지: ${userRequest.slice(0, 1500)}

action 규칙:
- apply: 왼쪽 정본·작업 영역·캔버스·패널에 **반영·업데이트·수정·추가** 요청. 대화에서 방금 정리한 내용을 정본에 넣어 달라는 요청 포함. 웹 조사 없이 대화·요청만으로 반영 가능할 때.
- research_and_apply: 웹 조사가 필요하고, 그 결과를 왼쪽 정본에도 반영해야 할 때.
- research: 웹 조사·추가 정보 요청이지만 왼쪽 정본 수정 요청은 없을 때.
- chat_only: 의미 설명, 일반 코칭, 감사 인사, 정본 수정·조사가 필요 없을 때.

${PRE_PMF_WRITING_TONE_RULE}

JSON만 응답:
{
  "action": "chat_only" | "research" | "apply" | "research_and_apply",
  "searchQueries": ["research 또는 research_and_apply일 때 1~4개"],
  "coachReply": "chat_only일 때만 — 짧고 따뜻한 한국어 답변"
}
`.trim();
}

function buildSynthesisPrompt(
  problem: string,
  overviewJson: string,
  userRequest: string,
  conversation: string,
  searchResults: WebSearchResult[],
): string {
  return `
예비 창업자가 사전 조사 결과를 보며 추가 웹 조사를 요청했습니다.
조사 결과를 **코치 대화 말풍선**에 보여 줄 텍스트로 작성하세요. 왼쪽 작업 영역은 수정하지 않습니다.

문제점·초기 아이디어: ${problem.slice(0, 2000)}

현재 왼쪽 정본:
${overviewJson}

최근 코치 대화:
${conversation}

사용자 요청: ${userRequest.slice(0, 1500)}

${groundingBlock("웹검색 결과", searchResults)}

반드시 JSON만 응답:
{
  "coachReply": "조사 결과 본문 — 3~8문장. 마지막에 왼쪽 정본은 그대로 두었음을 한 줄로 안내."
}

규칙:
- ${PRE_PMF_WRITING_TONE_RULE}
- 왼쪽 패널을 업데이트했다고 말하지 않음
`.trim();
}

function buildApplyPrompt(
  problem: string,
  overviewJson: string,
  userRequest: string,
  conversation: string,
  searchResults: WebSearchResult[],
): string {
  const searchBlock = searchResults.length
    ? `\n${groundingBlock("웹검색 결과 (반영 시 근거로 사용)", searchResults)}\n`
    : "";

  return `
예비 창업자가 코치 대화 내용을 **왼쪽 사전 조사 작업 영역(정본)** 에 반영해 달라고 요청했습니다.
최근 대화·사용자 요청·현재 정본을 근거로, **새로 추가·보완할 내용만** overviewPatch에 담으세요.
서버가 기존 정본과 **자동으로 합칩니다** — 정본 전체를 다시 쓰지 마세요.

문제점·초기 아이디어: ${problem.slice(0, 2000)}

현재 왼쪽 정본 JSON:
${overviewJson}

최근 코치 대화:
${conversation}

사용자 요청: ${userRequest.slice(0, 1500)}
${searchBlock}

반드시 JSON만 응답:
{
  "coachReply": "왼쪽에 무엇을 반영했는지 2~4문장으로 안내. '반영했어요'라고 명확히 말함.",
  "overviewPatch": {
    "targetUsers": [{"name": "세그먼트 라벨", "reason": "한 문장 프로필"}],
    "researchLenses": {
      "value_proposition": {
        "targetUsers": "· 타겟 1~2줄",
        "currentBehavior": "· 현재 행태",
        "marketEnvironment": "· 시장 환경",
        "judgmentResult": "· 판정 한 줄"
      },
      "key_features": { "targetUsers": "", "currentBehavior": "", "marketEnvironment": "· 산업·시장 환경", "judgmentResult": "· 판정" },
      "market_environment": { "...": "..." },
      "current_alternatives": { "...": "..." }
    },
    "problemStatement": "변경 시만",
    "valueProposition": { "body": "변경 시만" },
    "industryLandscape": { "body": "변경 시만" },
    "marketSize": { "body": "변경 시만" },
    "marketStats": [{"label": "", "value": "", "source": ""}],
    "competitiveLandscape": { "body": "변경 시만" },
    "businessModel": "변경 시만"
  }
}

규칙:
- ${PRE_PMF_WRITING_TONE_RULE}
- overviewPatch에는 **이번에 새로 넣을·보완할 내용만** 포함하세요. 기존 정본에 이미 있는 문장·세그먼트·지표를 통째로 다시 넣지 마세요.
- 기존 내용은 삭제·대체하지 않습니다. targetUsers는 **추가할 세그먼트만** 배열에 넣으세요 (기존 타겟은 서버가 유지).
- 본문(body)·렌즈 필드는 **추가할 불릿 줄만** · 로 시작해 넣으세요.
- marketStats·similarServices도 **새 항목만** 추가하세요.
- targetUsers를 추가할 때 researchLenses.value_proposition.targetUsers에는 **새 타겟 불릿만** 넣으세요.
- 렌즈별 본문은 researchLenses에 해당 id의 **추가 필드**만 채우면 왼쪽 4개 렌즈 카드에 누적됩니다.
- 대화에서 방금 정의한 세그먼트·구분·수치가 있으면 그것을 patch에 담으세요.
- URL·출처명은 body 본문에 넣지 마세요.
- coachReply에서는 기존 내용을 유지한 채 무엇을 **추가·보완**했는지 안내하세요.
`.trim();
}

interface IntentRaw {
  action?: string;
  searchQueries?: unknown;
  coachReply?: unknown;
}

interface ApplyRaw {
  coachReply?: unknown;
  overviewPatch?: unknown;
}

function strList(v: unknown, max = 6): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

function isResearchIntent(text: string): boolean {
  return /조사|보완|추가|찾아|검색|더\s*자세|심화|알아봐|리서치|경쟁|시장|유사|서비스|타겟|세그먼트|이해관계/i.test(
    text,
  );
}

function isApplyIntent(text: string): boolean {
  return /왼쪽|정본|작업\s*영역|캔버스|패널|반영|업데이트|수정|넣어|추가해|갱신|저장|기록/i.test(
    text,
  );
}

function resolveFollowupAction(
  userRequest: string,
  intentAction?: string,
): FollowupAction {
  const wantsApply = isApplyIntent(userRequest);
  const wantsResearch = isResearchIntent(userRequest);

  if (intentAction === "apply") return "apply";
  if (intentAction === "research_and_apply") return "research_and_apply";
  if (intentAction === "research") {
    return wantsApply ? "research_and_apply" : "research";
  }
  if (intentAction === "chat_only") {
    if (wantsApply && wantsResearch) return "research_and_apply";
    if (wantsApply) return "apply";
    if (wantsResearch) return "research";
    return "chat_only";
  }

  if (wantsApply && wantsResearch) return "research_and_apply";
  if (wantsApply) return "apply";
  if (wantsResearch) return "research";
  return "chat_only";
}

function parseConversationHistory(body: unknown): { role: string; content: string }[] {
  const raw = (body as { conversationHistory?: unknown }).conversationHistory;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      role: typeof item.role === "string" ? item.role : "model",
      content: typeof item.content === "string" ? item.content.trim() : "",
    }))
    .filter((item) => item.content.length > 0);
}

async function runApplyOverview(
  problem: string,
  overview: PrePmfOverviewData,
  userRequest: string,
  conversation: string,
  searchResults: WebSearchResult[],
): Promise<{ coachReply: string; overview: PrePmfOverviewData; updated: boolean }> {
  const models = resolveGeminiTextModels();
  const overviewJson = serializePrePmfOverviewForFollowup(overview);

  const applyResult = await geminiChat({
    user: buildApplyPrompt(
      problem,
      overviewJson,
      userRequest,
      conversation,
      searchResults,
    ),
    models,
    temperature: 0.25,
    jsonMode: true,
  });

  let coachReply = "요청하신 내용을 왼쪽 사전 조사 결과에 반영했어요.";
  let patch: unknown = null;

  try {
    const raw = JSON.parse(applyResult.text) as ApplyRaw;
    if (typeof raw.coachReply === "string" && raw.coachReply.trim()) {
      coachReply = raw.coachReply.trim();
    }
    if (raw.overviewPatch && typeof raw.overviewPatch === "object") {
      patch = raw.overviewPatch;
    }
  } catch {
    coachReply = applyResult.text.trim().slice(0, 2000) || coachReply;
  }

  if (!patch) {
    return { coachReply, overview, updated: false };
  }

  const merged = applyPrePmfOverviewPatch(overview, patch);
  const updated = prePmfOverviewPatchHasChanges(overview, merged);
  return { coachReply, overview: merged, updated };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const problem =
    typeof (body as { problem?: string }).problem === "string"
      ? (body as { problem: string }).problem.trim().slice(0, 2000)
      : "";
  const userRequest =
    typeof (body as { userRequest?: string }).userRequest === "string"
      ? (body as { userRequest: string }).userRequest.trim().slice(0, 2000)
      : "";

  if (!userRequest) {
    return NextResponse.json(
      { error: "조사 요청 내용이 필요합니다." },
      { status: 400 },
    );
  }

  const overview = normalizePrePmfOverview(
    (body as { overview?: unknown }).overview,
  );
  const conversation = formatFollowupConversationHistory(
    parseConversationHistory(body),
  );
  const overviewJson = serializePrePmfOverviewForFollowup(overview);

  if (!resolveGeminiApiKey()) {
    return NextResponse.json({
      coachReply:
        "지금은 자동 조사·반영 기능을 쓸 수 없어요. 왼쪽 결과를 보며 궁금한 점을 말씀해 주시면 방향만 짚어 드릴게요.",
      researched: false,
      overviewUpdated: false,
    });
  }

  const models = resolveGeminiTextModels();

  try {
    let intentAction: string | undefined;
    let searchQueries: string[] = [];
    let chatOnlyReply = "";

    const intentResult = await geminiChat({
      user: buildIntentPrompt(problem, overviewJson, userRequest, conversation),
      models,
      temperature: 0.2,
      jsonMode: true,
    });

    try {
      const intent = JSON.parse(intentResult.text) as IntentRaw;
      intentAction = intent.action;
      searchQueries = strList(intent.searchQueries, 4);
      if (typeof intent.coachReply === "string") {
        chatOnlyReply = intent.coachReply.trim();
      }
    } catch {
      /* heuristic fallback */
    }

    const action = resolveFollowupAction(userRequest, intentAction);

    if (action === "chat_only") {
      if (!chatOnlyReply) {
        const chat = await geminiChat({
          user: `사전 조사 결과에 대한 질문에 짧게 답하세요. 왼쪽 정본은 수정하지 않습니다.\n${PRE_PMF_WRITING_TONE_RULE}\n\n정본 요약:\n${overviewJson}\n\n대화:\n${conversation}\n\n질문: ${userRequest}`,
          models,
          temperature: 0.5,
        });
        chatOnlyReply = chat.text.trim();
      }
      return NextResponse.json({
        coachReply: chatOnlyReply,
        researched: false,
        overviewUpdated: false,
      });
    }

    let searchResults: WebSearchResult[] = [];
    if (action === "research" || action === "research_and_apply") {
      if (!searchQueries.length) {
        const base = problem || userRequest;
        searchQueries = [
          `${base} ${userRequest}`.slice(0, 120),
          `${base} market competitors`.slice(0, 120),
        ];
      }
      searchResults = await webSearchMany(searchQueries);
    }

    if (action === "apply" || action === "research_and_apply") {
      const applied = await runApplyOverview(
        problem,
        overview,
        userRequest,
        conversation,
        searchResults,
      );

      let coachReply = applied.coachReply;
      const footer = formatSourcesFooter(searchResults);
      if (footer && action === "research_and_apply" && !coachReply.includes("http")) {
        coachReply = `${coachReply}${footer}`;
      }

      return NextResponse.json({
        coachReply,
        researched: action === "research_and_apply",
        overviewUpdated: applied.updated,
        overview: applied.updated ? applied.overview : undefined,
        source: "gemini",
      });
    }

    const synthesisResult = await geminiChat({
      user: buildSynthesisPrompt(
        problem,
        overviewJson,
        userRequest,
        conversation,
        searchResults,
      ),
      models,
      temperature: 0.35,
      jsonMode: true,
    });

    let coachReply =
      "요청하신 주제로 웹 조사를 마쳤어요. 아래 내용은 가설이니 다음 단계 사용자 조사로 검증해 주세요.";

    try {
      const syn = JSON.parse(synthesisResult.text) as { coachReply?: unknown };
      if (typeof syn.coachReply === "string" && syn.coachReply.trim()) {
        coachReply = syn.coachReply.trim();
      }
    } catch {
      coachReply = synthesisResult.text.trim().slice(0, 3000);
    }

    const footer = formatSourcesFooter(searchResults);
    if (footer && !coachReply.includes("http")) {
      coachReply = `${coachReply}${footer}`;
    }

    return NextResponse.json({
      coachReply,
      researched: true,
      overviewUpdated: false,
      source: "gemini",
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "추가 조사 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
