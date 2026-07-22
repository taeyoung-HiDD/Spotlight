import { geminiChat } from "@/lib/ai/providers/geminiText";
import { resolveGeminiTextModels } from "@/lib/ai/env";
import {
  webSearchMany,
  type WebSearchResult,
} from "@/lib/ai/providers/webSearch";
import {
  buildHeuristicProblemStatement,
  DT_PROBLEM_STATEMENT_WRITING_RULE,
} from "@/lib/stages/problemStatement";
import {
  enrichSimilarServiceUrls,
  extractPrePmfSearchTopic,
  extractPrePmfIndustrySearchTopic,
  filterSimilarServiceItemsWithNote,
  normalizePrePmfNextActivities,
  normalizePrePmfPersonItems,
  normalizePrePmfTechnologyItems,
  normalizePrePmfStatCards,
  PRE_PMF_MAX_SIMILAR_SERVICES,
  normalizePrePmfVerdict,
  normalizeLensClassificationNotes,
  normalizeResearchLenses,
  sanitizePrePmfMarketStats,
  emptyPrePmfSection,
  finalizePrePmfVerdictAndNextSteps,
  DEFAULT_VERDICT_PATH_ACTIVITIES,
  PRE_PMF_WRITING_TONE_RULE,
  type PrePmfNextActivitySuggestion,
  type PrePmfOverviewData,
  type PrePmfPersonItem,
  type PrePmfSourceRef,
  type SimilarServiceItem,
} from "@/lib/stages/stage2/prePmfOverview";
import { getSidebarStage } from "@/lib/stages/sidebarNav";
import { normalizePrePmfReadableBody } from "@/lib/stages/stage2/prePmfReadable";

interface RawOverview {
  problemStatement?: unknown;
  targetUsers?: unknown;
  stakeholders?: unknown;
  marketSize?: unknown;
  industryLandscape?: unknown;
  competitiveLandscape?: unknown;
  similarServices?: unknown;
  businessModel?: unknown;
  nextSteps?: unknown;
  solution?: unknown;
  valueProposition?: unknown;
  reachableMarket?: unknown;
  keyFeatures?: unknown;
  marketStats?: unknown;
  requiredTechnology?: unknown;
  technologyItems?: unknown;
  verdict?: unknown;
  lensClassificationNotes?: unknown;
  researchLenses?: unknown;
}

function toSources(results: WebSearchResult[], max = 5): PrePmfSourceRef[] {
  return results
    .filter((r) => r.url.trim())
    .slice(0, max)
    .map((r) => ({
      title: r.title || r.url,
      url: r.url,
    }));
}

function groundingBlock(label: string, results: WebSearchResult[]): string {
  if (!results.length) {
    return `[${label} 웹검색 자료] (검색 결과 없음 — 일반 지식 기반 가설로 작성하세요)`;
  }
  const lines = results.slice(0, 6).map(
    (r, i) =>
      `(${i + 1}) ${r.title}\n${r.content.slice(0, 400)}\n출처: ${r.url}`,
  );
  return `[${label} 웹검색 자료]\n${lines.join("\n\n")}`;
}

function readableField(text: string): string {
  const t = text.trim();
  return t ? normalizePrePmfReadableBody(t) : "";
}

function buildNextActivityStageCatalog(): string {
  const lines: string[] = [];
  for (let id = 3; id <= 11; id++) {
    const label = getSidebarStage(id)?.navLabel ?? `단계 ${id}`;
    lines.push(`${id}: ${label}`);
  }
  return lines.join("\n");
}

function buildPrompt(
  problem: string,
  industry: WebSearchResult[],
  market: WebSearchResult[],
  competitor: WebSearchResult[],
  similar: WebSearchResult[],
): string {
  return `
당신은 예비 창업자를 돕는 창업 코치의 사전 조사(Pre-PMF) 보조입니다.
1단계에서 입력한 사용자 문제·초기 아이디어를 기준으로, 시장 적합성(Pre-Product Market Fit)을 사전 점검하는 Overview를 한국어로 작성하세요.
아래 웹검색 자료가 있으면 그 사실을 근거로 삼고(수치·출처 활용), 없으면 일반 지식 기반 가설로 작성하되 단정하지 마세요.

1단계 입력 (사용자 문제·초기 아이디어): ${problem.slice(0, 2500) || "(미입력)"}

${groundingBlock("산업·실물 경제", industry)}

${groundingBlock("디지털·서비스 시장 규모·성장률", market)}

${groundingBlock("경쟁 현황", competitor)}

${groundingBlock("유사 서비스", similar)}

반드시 아래 JSON 스키마로만 응답하세요 (코드블록·설명 없이 JSON 객체만):
{
  "problemStatement": "문제 정의(POV) — 각 요점을 줄바꿈하고 줄마다 · 로 시작. 사용자·맥락·니즈·인사이트, 솔루션 없음",
  "targetUsers": [{"name": "세그먼트·역할명", "reason": "한 문장 프로필 (누구인지·상황·원하는 것)"}],
  "industryLandscape": "· 문제·아이디어 뒤에 깔린 **실물·오프라인 산업**이 국내에서 어떻게 형성돼 있는지(예: 카페 검색 앱이면 국내 카페·외식 산업 구조)\\n· 산업 규모·점포·업체 수·주요 플레이어·유통·공급망 흐름\\n· 최근 2~3년 산업 트렌드·소비자 행태 변화\\n· 디지털 서비스와의 접점 한 줄(출처·URL 없이)",
  "marketSize": "· 문제·아이디어와 직접 연결된 **디지털·서비스 시장**이 무엇인지(범위·국내/세그먼트)\\n· 그 시장의 규모·성장률(대략적 수치)\\n· 최근 2~3년 흐름·트렌드가 어떻게 변해 왔는지\\n· 앞으로 방향 한 줄(가설 톤, 출처·URL 없이)",
  "competitiveLandscape": "· 경쟁사·대안 한 줄씩\\n· 차별·공백 한 줄(출처·URL 없이)",
  "similarServices": [{"name": "서비스명", "region": "global", "note": "한 줄 설명", "url": "https://..."}],
  "businessModel": "· 수익 가설 한 줄씩",
  "valueProposition": "「~하기 위해서 ~하고 싶다」 형태의 잠재 니즈 한 문장 (해결책이 아니라 사용자가 진짜 원하는 상태)",
  "keyFeatures": "· 고객이 기대하는 핵심 기능 1\\n· 핵심 기능 2\\n· 핵심 기능 3",
  "marketStats": [{"label": "지표명(예: 국내 XX 시장 규모)", "value": "수치(예: 1.2조 원)", "source": "출처: OO리포트, 2026"}],
  "requiredTechnology": "· 프로토타입 구현 관점 요약 한 줄\\n· 기술 스택·아키텍처 방향 한 줄",
  "technologyItems": [{"name": "기술·스택명", "note": "핵심 기능·프로토타입에서의 역할 한 줄"}],
  "verdict": {
    "decision": "go | hypothesis_board | loop_back",
    "rationale": "그렇게 판단한 근거 한 줄",
    "goActivities": [{"stageId": 3, "description": "GO 시 실행할 구체 과제 한 줄"}],
    "hypothesisActivities": [{"stageId": 3, "description": "검증이 필요할 때 할 구체 과제 한 줄"}],
    "loopBackActivities": [{"stageId": 1, "description": "방향 재정의 시 할 구체 과제 한 줄"}]
  },
  "lensClassificationNotes": {
    "value_proposition": "가설로 분류한 이유 한 줄 (해당 렌즈가 가설일 때만)",
    "key_features": "가설 분류 이유",
    "current_alternatives": "가설 분류 이유",
    "market_environment": "가설 분류 이유"
  },
  "researchLenses": {
    "value_proposition": {
      "targetUsers": "· 이 렌즈 관점의 타겟 사용자 1~2줄",
      "currentBehavior": "· 문제를 푸는 현재 우회로·행태 1~3줄",
      "marketEnvironment": "· 연관 시장 규모·성장률·트렌드 1~3줄",
      "judgmentResult": "· 이 렌즈 판정 한 줄(강점·약점·검증 필요)"
    },
    "current_alternatives": { "targetUsers": "...", "currentBehavior": "...", "marketEnvironment": "...", "judgmentResult": "..." },
    "market_environment": { "targetUsers": "...", "currentBehavior": "...", "marketEnvironment": "...", "judgmentResult": "..." },
    "key_features": {
      "targetUsers": "",
      "currentBehavior": "",
      "marketEnvironment": "· [산업·실물] 오프라인 산업 구조·흐름 1~2줄\\n· [디지털·서비스] 연관 시장 범위·규모·성장률·트렌드 2~3줄",
      "judgmentResult": "· 시장 환경 렌즈 판정 한 줄"
    }
  }
}

워크북 단계·활동 목록 (stageId는 아래 번호만 사용):
${buildNextActivityStageCatalog()}

규칙:
- 1단계 입력에 사용자 문제와 초기 아이디어가 함께 있으면 problemStatement에 **Design Thinking Problem Statement(POV)** 원칙으로 문제를 정리하고, 시장·경쟁·유사 서비스·비즈니스 모델은 아이디어 방향도 함께 반영하세요. 아이디어만 있으면 그 아이디어가 풀려는 **사용자 니즈**를 추론해 가설로 적으세요.
${DT_PROBLEM_STATEMENT_WRITING_RULE}
- problemStatement, marketSize, competitiveLandscape, businessModel은 **한 문단으로 이어 쓰지 말고** 줄바꿈(\\n)으로 나누고 각 줄은 **·** 로 시작하세요.
- 한 줄에 하나의 요점만 — 2문장 이상 이어 붙이지 마세요.
- targetUsers는 **주 사용 고객(문제를 직접 겪는 사람)** 2~4개 세그먼트입니다. 각 항목은 name(역할·세그먼트 라벨) + reason(**불릿 없이 한 문장** 프로필)만 씁니다.
- targetUsers reason 예: 「혁신적인 아이디어를 가지고 있지만 사업화 경험이 부족하고 아이디어를 구체적인 제품이나 서비스로 만들고 싶어해요」 — 1~2개 절로 짧게, 존댓말(~해요/~이에요).
- targetUsers name은 **역할·세그먼트 라벨만** (예: 예비 창업가, 20대 직장인). 운영·공급·규제 주체(이해 관계자)는 넣지 마세요.
- industryLandscape는 **렌즈2 산업·실물 경제**용입니다. 앱·플랫폼·서비스가 아니라, 그 뒤에 깔린 **오프라인·실물 산업**이 국내에서 어떻게 형성돼 있는지 **·** 한 줄씩 씁니다. (예: 카페 정보 검색 서비스 → 국내 카페·커피 전문점 산업 규모·점포 수·프랜차이즈·소비 트렌드)
- marketSize는 **렌즈2 디지털·서비스 시장**용입니다. 문제·아이디어와 직접 연결된 온라인·앱·SaaS·플랫폼 시장의 범위·규모·성장·트렌드를 **·** 한 줄씩 씁니다.
- marketStats는 **렌즈2** 보조 지표 카드 3~6개. **산업·서비스 시장** 규모·연평균 성장률(CAGR)·점포·이용자·도메인 세그먼트 지표를 포함하세요. 무관 거대 트렌드(생성형 AI 전체 등) 금지. 자료 없으면 [] 가능하나 가능하면 3개 이상 채우세요.
- industryLandscape, marketSize, competitiveLandscape, businessModel 본문에는 URL·출처명·(출처: …)를 넣지 마세요. 출처는 marketStats·화면 하단 링크로만 표시됩니다.
- similarServices는 글로벌(global)과 한국(korea) 사례를 **최대 3개**까지 포함하세요. 각 항목에 웹검색 자료의 공식 URL을 url 필드로 넣으세요.
- verdict.goActivities는 **지금 바로 실행(GO)** 할 때 이어갈 워크북 단계·활동 2~4개입니다 (보통 3·8·11단계 등 실행 중심).
- verdict.hypothesisActivities는 **더 검증 후 결정(HYPOTHESIS BOARD)** 할 때 거쳐야 할 검증 단계·활동 2~4개입니다 (보통 3·4·5단계 등 조사·니즈 검증).
- verdict.loopBackActivities는 **방향 재정의(LOOP-BACK)** 할 때 돌아갈 단계·활동 2~3개입니다 (보통 1·2단계).
- 각 activities 항목의 stageId는 반드시 워크북 목록 번호이고, description은 그 단계에서 할 구체 과제를 한 줄로 씁니다.
- valueProposition은 해결책·기능이 아니라 사용자의 **잠재 니즈**를 「~하기 위해서 ~하고 싶다」 한 문장으로 쓰세요 (디자인씽킹 빙산 모델).
- keyFeatures는 내부 보조 필드입니다. 고객이 기대할 핵심 솔루션 기능 3~5개를 불릿(·) 한 줄씩 쓰되, **렌즈2 시장 환경 본문에는 넣지 마세요**.
- keyFeatures 각 줄은 기능명 + 한 줄 효과(무엇을 해결·도와주는지)로 짧게 씁니다.
- researchLenses.key_features는 **렌즈2 시장 환경** 전용입니다. targetUsers·currentBehavior는 비우고, marketEnvironment에 **(1) 산업·실물 경제 맥락**과 **(2) 디지털·서비스 시장**을 함께 **·** 4~6줄로 씁니다. judgmentResult는 이 시장·산업 환경이 기회인지·검증이 필요한지 한 줄로 씁니다.
- requiredTechnology·technologyItems는 내부 보조 필드입니다. 화면 렌즈에는 표시하지 않으므로 프로토타입 관점 기술 요약만 간단히 채우세요.
- verdict.decision은 go(지금 실행), hypothesis_board(더 검증 후 결정), loop_back(방향 재정의) 중 하나로, **4개 렌즈** 종합 판단을 고르세요.
- lensClassificationNotes는 **4개 렌즈** id별로 가설(hypothesis)로 남는 이유를 한 줄씩 씁니다. 웹검색·데이터로 검증된 렌즈는 비워 두세요.
- researchLenses는 **4개 렌즈** id(value_proposition, key_features, current_alternatives, market_environment) 각각에 targetUsers·currentBehavior·marketEnvironment·judgmentResult 4필드를 채웁니다. 각 필드는 **·** 로 시작하는 줄 1~3개, URL·출처명 금지. judgmentResult에는 해당 렌즈의 강점·약점·검증 필요를 한 줄로 씁니다.
- ${PRE_PMF_WRITING_TONE_RULE}
- 한국 시장 맥락을 우선 고려하세요.
`.trim();
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseSimilarServices(
  v: unknown,
  similarResults: WebSearchResult[],
): SimilarServiceItem[] {
  if (!Array.isArray(v)) return [];
  const parsed = v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
    .map((x) => ({
      name: str(x.name),
      region: x.region === "korea" ? ("korea" as const) : ("global" as const),
      note: str(x.note),
      url: str(x.url) || undefined,
    }))
    .filter((x) => x.name)
    .slice(0, PRE_PMF_MAX_SIMILAR_SERVICES);
  return filterSimilarServiceItemsWithNote(
    enrichSimilarServiceUrls(parsed, similarResults),
  );
}

async function geminiChatWithRetry(
  user: string,
  attempts = 2,
): Promise<Awaited<ReturnType<typeof geminiChat>>> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await geminiChat({
        user,
        models: resolveGeminiTextModels(),
        temperature: 0.4,
        jsonMode: true,
      });
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  throw lastError ?? new Error("Gemini generation failed");
}

/** API 키 없을 때 반환하는 최소 템플릿 */
export function buildPrePmfHeuristicFallback(problem: string): PrePmfOverviewData {
  return {
    problemStatement: readableField(buildHeuristicProblemStatement(problem)),
    targetUsers: [
      {
        name: "문제를 직접 겪는 핵심 사용자",
        reason:
          "입력하신 문제를 직접 겪고 있지만 구체적 해결 방법을 찾지 못한 상태로 보여요.",
      },
    ] satisfies PrePmfPersonItem[],
    stakeholders: [],
    marketSize: {
      status: "done",
      body: readableField(
        "· 입력 주제와 연관된 디지털·서비스 시장 규모를 정리해요.\n· 성장률·트렌드는 공개 자료로 추가 확인이 필요해요.",
      ),
      sources: [],
    },
    industryLandscape: {
      status: "done",
      body: readableField(
        "· 입력 주제 뒤에 깔린 실물·오프라인 산업 구조를 정리해요.\n· 산업 규모·트렌드는 공개 자료로 추가 확인이 필요해요.",
      ),
      sources: [],
    },
    competitiveLandscape: {
      status: "done",
      body: readableField(
        "· 유사 문제를 다루는 기존 서비스·대안이 있을 것으로 보여요.\n· 차별점 정의를 위한 조사가 필요해요.",
      ),
      sources: [],
    },
    similarServices: {
      status: "done",
      items: [],
      sources: [],
    },
    businessModel: readableField(
      "· 수익 모델은 사용자 가치 검증 이후 구체화하는 것이 좋아요.\n· 현재는 가설 단계예요.",
    ),
    solution: "",
    valueProposition: {
      status: "done",
      body: readableField(
        "· 사용자가 진짜 원하는 잠재 니즈는 사용자 조사로 확인이 필요해요.",
      ),
      sources: [],
    },
    keyFeatures: {
      status: "done",
      body: readableField(
        "· 문제·아이디어를 바탕으로 고객이 기대할 핵심 기능을 정리할 필요가 있어요.",
      ),
      sources: [],
    },
    reachableMarket: emptyPrePmfSection(),
    marketStats: [],
    requiredTechnology: {
      status: "done",
      body: readableField(
        "· 문제·아이디어와 핵심 기능을 프로토타입으로 옮기려면 기술 스택을 구체화할 필요가 있어요.\n· 팀 역량과 구현 난이도를 함께 점검해 보세요.",
      ),
      sources: [],
    },
    technologyItems: [
      {
        name: "웹/앱 프레임워크",
        note: "사용자가 체험할 프로토타입 화면과 핵심 기능 흐름을 빠르게 구현해요.",
      },
      {
        name: "백엔드·API",
        note: "핵심 기능 데이터 처리와 외부 서비스 연동을 담당해요.",
      },
      {
        name: "AI·데이터 처리",
        note: "아이디어의 핵심 가치를 프로토타입에서 검증할 수 있게 도와요.",
      },
    ],
    revenueModel: emptyPrePmfSection(),
    risks: [],
    ...(() => {
      const { verdict, nextSteps } = finalizePrePmfVerdictAndNextSteps(
        {
          decision: "hypothesis_board",
          rationale: readableField(
            "아직 검증되지 않은 가설이 많아 추가 조사 후 결정하는 것이 좋아요.",
          ),
          goActivities: DEFAULT_VERDICT_PATH_ACTIVITIES.go,
          hypothesisActivities: [
            {
              stageId: 3,
              description:
                "타겟 사용자 인터뷰 질문을 정리하고 핵심 가설을 검증할 준비를 해요.",
            },
            {
              stageId: 5,
              description:
                "사용자 조사 결과로 진짜 필요와 잠재 니즈를 정리해요.",
            },
          ],
          loopBackActivities: DEFAULT_VERDICT_PATH_ACTIVITIES.loop_back,
        },
        [],
      );
      return { verdict, nextSteps };
    })(),
    lensClassificationNotes: {},
    researchLenses: {},
    lensBodies: {},
    researchInteractionId: "",
    sourceProblem: problem.trim(),
    generatedAt: new Date().toISOString(),
    generationStatus: "error",
  };
}

/**
 * 웹검색 grounding + Gemini JSON — Deep Research 비활성·실패 시 폴백.
 * Vercel 등 서버리스에서도 동작하도록 API 라우트와 research-status에서 공유.
 */
export async function runSyncPrePmfOverview(
  problem: string,
): Promise<PrePmfOverviewData> {
  const topic = extractPrePmfSearchTopic(problem) || "초기 아이디어";
  const industryTopic = extractPrePmfIndustrySearchTopic(problem) || topic;
  const [industry, market, competitor, similar] = await Promise.all([
    webSearchMany([
      `국내 ${industryTopic} 산업 규모`,
      `${industryTopic} 산업 현황 트렌드`,
      `${industryTopic} 업계 시장 Korea industry`,
    ]),
    webSearchMany([
      `${topic} 국내 시장 규모`,
      `${topic} 시장 성장률 CAGR`,
      `${topic} market size Korea`,
    ]),
    webSearchMany([
      `${topic} 경쟁 서비스 대안`,
      `${topic} competitors alternatives`,
    ]),
    webSearchMany([
      `${topic} 유사 서비스`,
      `${topic} similar apps services`,
    ]),
  ]);

  const result = await geminiChatWithRetry(
    buildPrompt(problem, industry, market, competitor, similar),
  );

  let raw: RawOverview;
  try {
    raw = JSON.parse(result.text) as RawOverview;
  } catch {
    throw new Error("사전 조사 결과를 해석하지 못했습니다.");
  }

  const legacyNextSteps = normalizePrePmfNextActivities(raw.nextSteps);
  const verdictRaw = normalizePrePmfVerdict(raw.verdict);
  const { verdict, nextSteps } = finalizePrePmfVerdictAndNextSteps(
    verdictRaw,
    legacyNextSteps,
  );
  const problemContext = problem.trim();
  const marketStatsRaw = normalizePrePmfStatCards(raw.marketStats, 6);

  return {
    problemStatement: readableField(str(raw.problemStatement)),
    targetUsers: normalizePrePmfPersonItems(raw.targetUsers),
    stakeholders: [],
    industryLandscape: {
      status: "done",
      body: readableField(str(raw.industryLandscape)),
      sources: toSources(industry),
    },
    marketSize: {
      status: "done",
      body: readableField(str(raw.marketSize)),
      sources: toSources(market),
    },
    competitiveLandscape: {
      status: "done",
      body: readableField(str(raw.competitiveLandscape)),
      sources: toSources(competitor),
    },
    similarServices: {
      status: "done",
      items: parseSimilarServices(raw.similarServices, similar),
      sources: toSources(similar),
    },
    businessModel: readableField(str(raw.businessModel)),
    nextSteps,
    solution: readableField(str(raw.solution)),
    valueProposition: {
      status: "done",
      body: readableField(str(raw.valueProposition)),
      sources: [],
    },
    keyFeatures: {
      status: "done",
      body: readableField(str(raw.keyFeatures ?? raw.reachableMarket)),
      sources: [],
    },
    reachableMarket: {
      status: "done",
      body: "",
      sources: [],
    },
    marketStats: sanitizePrePmfMarketStats(problemContext, marketStatsRaw),
    requiredTechnology: {
      status: "done",
      body: readableField(str(raw.requiredTechnology)),
      sources: [],
    },
    technologyItems: normalizePrePmfTechnologyItems(raw.technologyItems),
    revenueModel: emptyPrePmfSection(),
    risks: [],
    verdict,
    lensClassificationNotes: normalizeLensClassificationNotes(
      raw.lensClassificationNotes,
    ),
    researchLenses: normalizeResearchLenses(raw.researchLenses),
    lensBodies: {},
    researchInteractionId: "",
    sourceProblem: problem.trim(),
    generatedAt: new Date().toISOString(),
    generationStatus: "done",
  };
}
