import { STAGE_COUNT } from "@/lib/stages/constants";
import { getSidebarStage } from "@/lib/stages/sidebarNav";
import { parseProfileItem } from "@/lib/stages/stage2/peopleFindingsPresentation";
import { normalizePrePmfReadableBody } from "@/lib/stages/stage2/prePmfReadable";

/**
 * 단계 2 — 사전 조사하기 (Pre-PMF Overview)
 * 1단계 문제점을 입력으로 초기 아이디어·문제의 시장 적합성(Pre-Product Market Fit)을
 * 사전 점검하는 구조화 리포트. 시장·경쟁·유사 서비스 섹션은 웹검색 근거를 동반한다.
 */

/** 사전 조사 Overview·follow-up 본문 공통 말투 (AI 프롬프트용) */
export const PRE_PMF_WRITING_TONE_RULE = `- 모든 서술은 친근한 존댓말(~했어요/~해요/~예요/~이에요/~돼요)로 쓰세요. 딱딱한 ~합니다/~입니다 체는 쓰지 마세요.
- 단정 대신 "~로 보여요/~로 추정돼요/검증이 필요해요" 톤을 쓰세요.`;

export type PrePmfSectionStatus = "idle" | "loading" | "done" | "error";

export interface PrePmfSourceRef {
  title: string;
  url: string;
}

/** 웹검색 근거가 붙는 서술형 섹션 (시장 규모·경쟁 현황) */
export interface PrePmfSection {
  status: PrePmfSectionStatus;
  body: string;
  sources: PrePmfSourceRef[];
}

/* ----------------------- 5-Lens Canvas 확장 모델 ----------------------- */

/** 데이터 투명성 — 웹검색 검증(fact) vs 추측·희망(hypothesis) */
export type PrePmfConfidence = "fact" | "hypothesis";

/** 5가지 타당성 렌즈 식별자 */
export const PRE_PMF_LENS_IDS = [
  "value_proposition",
  "current_alternatives",
  "market_environment",
  "key_features",
  "required_technology",
] as const;
export type PrePmfLensId = (typeof PRE_PMF_LENS_IDS)[number];

/** 렌즈 카드 4필드 — 타겟·행태·시장·판정 */
export interface PrePmfLensDetail {
  targetUsers: string;
  currentBehavior: string;
  marketEnvironment: string;
  judgmentResult: string;
}

/** 5-Lens 카드 제목·영문 라벨 (사전조사 리포트 시안) */
export const PRE_PMF_LENS_META: Record<
  PrePmfLensId,
  { title: string; eyebrow: string }
> = {
  value_proposition: {
    title: "어떤 고객에게 어떤 가치를 주는가",
    eyebrow: "Value Proposition",
  },
  key_features: {
    title: "관련된 시장 환경은 어떠한가",
    eyebrow: "Market Environment",
  },
  current_alternatives: {
    title: "고객은 지금 이 문제를 어떻게 해결하나",
    eyebrow: "Current Alternatives",
  },
  market_environment: {
    title: "누가, 언제, 어떻게 돈을 내는가",
    eyebrow: "Revenue Model",
  },
  required_technology: {
    title: "무엇 때문에 실패할 수 있는가",
    eyebrow: "Risk Triangle",
  },
};

/** 리포트 화면 렌즈 표시 순서 (4-Lens) */
export const PRE_PMF_REPORT_LENS_ORDER: PrePmfLensId[] = [
  "value_proposition",
  "key_features",
  "market_environment",
  "current_alternatives",
];

/** 렌즈2 유사 서비스·렌즈5 필요 기술 최대 항목 수 */
export const PRE_PMF_MAX_SIMILAR_SERVICES = 3;
export const PRE_PMF_MAX_TECHNOLOGY_ITEMS = 3;

/** 렌즈5 필요 기술 항목 */
export interface PrePmfTechnologyItem {
  /** 기술·스택·도구명 */
  name: string;
  /** 프로토타입에서의 역할·적용 이유 */
  note: string;
}

/** @deprecated 렌즈5 레거시 — required_technology로 마이그레이션 */
export type PrePmfRiskAxis = "market" | "execution" | "financial";

/** @deprecated */
export interface PrePmfRiskItem {
  axis: PrePmfRiskAxis;
  body: string;
  confidence: PrePmfConfidence;
}

/** Pre-PMF 최종 판단 */
export type PrePmfVerdictDecision =
  | "go"
  | "hypothesis_board"
  | "loop_back"
  | "";

/** 판단 경로 식별자 (decision과 동일, 빈 문자열 제외) */
export type PrePmfVerdictPath = Exclude<PrePmfVerdictDecision, "">;

export interface PrePmfVerdict {
  decision: PrePmfVerdictDecision;
  rationale: string;
  /** GO — 지금 바로 실행할 단계·활동 */
  goActivities: PrePmfNextActivitySuggestion[];
  /** HYPOTHESIS BOARD — 검증이 필요한 단계·활동 */
  hypothesisActivities: PrePmfNextActivitySuggestion[];
  /** LOOP-BACK — 방향 재정의를 위한 단계·활동 */
  loopBackActivities: PrePmfNextActivitySuggestion[];
}

/** AI 백필 통계 카드 (지표명·수치·출처 라벨) */
export interface PrePmfStatCard {
  label: string;
  value: string;
  /** 「출처: OO리포트, 2026」 식 라벨 (URL 없음) */
  source: string;
}

export interface SimilarServiceItem {
  name: string;
  region: "global" | "korea";
  note: string;
  url?: string;
}

export interface SimilarServiceUrlCandidate {
  title: string;
  url: string;
  content?: string;
}

function normalizeNameForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "").replace(/[^\w가-힣]/g, "");
}

function normalizeExternalUrl(url: string | undefined): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

/** 유사 서비스명·설명과 웹검색 결과를 매칭해 URL을 찾는다 */
export function matchSimilarServiceUrl(
  name: string,
  candidates: SimilarServiceUrlCandidate[],
  usedUrls: Set<string> = new Set(),
  note = "",
): string | undefined {
  const rawName = name.trim();
  if (!rawName && !note.trim()) return undefined;
  const nameLower = rawName.toLowerCase();
  const noteLower = note.trim().toLowerCase();
  const nameNorm = normalizeNameForMatch(rawName);

  let best: { url: string; score: number } | undefined;

  for (const c of candidates) {
    const url = normalizeExternalUrl(c.url);
    if (!url || usedUrls.has(url)) continue;

    const titleLower = (c.title ?? "").toLowerCase();
    const contentLower = (c.content ?? "").toLowerCase();
    const urlLower = url.toLowerCase();

    let score = 0;
    if (nameLower && titleLower.includes(nameLower)) score += 10;
    if (nameLower && contentLower.includes(nameLower)) score += 5;
    if (noteLower && (titleLower.includes(noteLower) || contentLower.includes(noteLower))) {
      score += 4;
    }
    if (nameNorm.length >= 2 && urlLower.includes(nameNorm)) score += 8;

    const firstWord = rawName.split(/\s+/)[0]?.trim();
    if (firstWord && firstWord.length >= 2 && titleLower.includes(firstWord.toLowerCase())) {
      score += 4;
    }

    // 서비스명 토큰 일부라도 제목·본문에 있으면 약한 매칭
    for (const token of rawName.split(/\s+/).filter((t) => t.length >= 2)) {
      const t = token.toLowerCase();
      if (titleLower.includes(t) || contentLower.includes(t)) score += 2;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { url, score };
    }
  }

  return best?.url;
}

/** 항목별 url이 없으면 웹검색 후보에서 보강 (매칭 실패 시 남은 출처 순서대로 연결) */
export function enrichSimilarServiceUrls(
  items: SimilarServiceItem[],
  candidates: SimilarServiceUrlCandidate[],
): SimilarServiceItem[] {
  const used = new Set<string>();
  const pool = candidates
    .map((c) => ({
      ...c,
      url: normalizeExternalUrl(c.url) ?? "",
    }))
    .filter((c) => c.url);

  const firstPass = items.map((item) => {
    const existing = normalizeExternalUrl(item.url);
    if (existing) {
      used.add(existing);
      return { ...item, url: existing };
    }
    const url = matchSimilarServiceUrl(item.name, pool, used, item.note);
    if (url) {
      used.add(url);
      return { ...item, url };
    }
    return { ...item };
  });

  const unused = pool.filter((c) => !used.has(c.url));
  let ui = 0;
  return firstPass.map((item) => {
    if (item.url || ui >= unused.length) return item;
    const url = unused[ui]?.url;
    ui += 1;
    if (!url) return item;
    used.add(url);
    return { ...item, url };
  });
}

/** 유사 서비스 — 설명(note)이 있는 항목만 표시·저장 */
export function filterSimilarServiceItemsWithNote(
  items: SimilarServiceItem[],
): SimilarServiceItem[] {
  return items.filter((item) => item.note.trim());
}

/** 항목에 연결되지 않은 출처만 (하단 칩용) */
export function similarServicesOrphanSources(
  items: SimilarServiceItem[],
  sources: PrePmfSourceRef[],
): PrePmfSourceRef[] {
  const linked = new Set(items.map((i) => i.url?.trim()).filter(Boolean));
  return sources.filter((s) => s.url.trim() && !linked.has(s.url.trim()));
}

/** 타겟 사용자·이해관계자 — 세그먼트명 + 구체 설명·이유 */
export interface PrePmfPersonItem {
  name: string;
  /** 어떤 사람인지, 왜 타겟/이해관계자인지 */
  reason: string;
}

export interface PrePmfSimilarServices {
  status: PrePmfSectionStatus;
  items: SimilarServiceItem[];
  sources: PrePmfSourceRef[];
}

/** 사전 조사 후 추천 활동 — 워크북 단계 번호 + 해당 단계 활동명 + 구체 과제 */
export interface PrePmfNextActivitySuggestion {
  stageId: number;
  description: string;
}

export interface PrePmfOverviewData {
  /** Design Thinking Problem Statement(POV) — 사용자·맥락·니즈·인사이트 */
  problemStatement: string;
  /** 예상 타겟 사용자 */
  targetUsers: PrePmfPersonItem[];
  /** 관련 이해관계자 */
  stakeholders: PrePmfPersonItem[];
  /** 렌즈2 시장 환경 — 디지털·서비스 시장 규모·성장률·트렌드 */
  marketSize: PrePmfSection;
  /** 렌즈2 시장 환경 — 실물·오프라인 산업 구조·흐름 (예: 국내 카페 산업) */
  industryLandscape: PrePmfSection;
  /** 경쟁 현황 (웹검색) */
  competitiveLandscape: PrePmfSection;
  /** 유사 서비스 — 글로벌/한국 (웹검색) */
  similarServices: PrePmfSimilarServices;
  /** 비즈니스 모델 가설 */
  businessModel: string;
  /** 검토 결과 기준 다음 활동 제안 (전체 단계 중 해당 단계·활동) */
  nextSteps: PrePmfNextActivitySuggestion[];
  /* --- 5-Lens Canvas 확장 필드 (구버전 artifact는 빈 값 → 레거시에서 파생) --- */
  /** 핵심 인풋 · 아이디어 한 줄 (Solution) */
  solution: string;
  /** 렌즈1 가치 제안 — 「~하기 위해서 ~하고 싶다」 잠재 니즈 */
  valueProposition: PrePmfSection;
  /** 렌즈2 핵심 기능 (Key Features) — 문제·아이디어 기반 기대 솔루션 기능 */
  keyFeatures: PrePmfSection;
  /** @deprecated 렌즈2 레거시 — keyFeatures로 마이그레이션 */
  reachableMarket: PrePmfSection;
  /** 렌즈3 AI 백필 통계 카드 */
  marketStats: PrePmfStatCard[];
  /** @deprecated 렌즈4 레거시(수익 모델) — market_environment(marketSize)로 마이그레이션 */
  revenueModel: PrePmfSection;
  /** 렌즈5 필요 기술 — 프로토타입 구현 관점 요약 */
  requiredTechnology: PrePmfSection;
  /** 렌즈5 기술·스택 항목 */
  technologyItems: PrePmfTechnologyItem[];
  /** @deprecated 렌즈5 레거시(위험 3축) */
  risks: PrePmfRiskItem[];
  /** Pre-PMF 최종 판단 */
  verdict: PrePmfVerdict;
  /** 렌즈별 가설 분류 이유 */
  lensClassificationNotes: Partial<Record<PrePmfLensId, string>>;
  /** 렌즈별 4필드 스냅샷 — AI 생성 우선, 없으면 레거시 필드에서 파생 */
  researchLenses: Partial<Record<PrePmfLensId, PrePmfLensDetail>>;
  /** 리포트 항목별 편집/생성 본문 — 직접 작성·항목별 AI 결과 (표시 최우선) */
  lensBodies: Partial<Record<PrePmfLensId, string>>;
  /** Deep Research Interaction ID (진행 중 폴링·새로고침 재개용) */
  researchInteractionId: string;
  /** 생성에 사용한 1단계 출발 입력 (변경 시 재생성) */
  sourceProblem: string;
  /** 마지막 생성 시각 (ISO) */
  generatedAt: string;
  /** 리포트 전체 생성 상태 */
  generationStatus: PrePmfSectionStatus;
}

export function emptyPrePmfSection(): PrePmfSection {
  return { status: "idle", body: "", sources: [] };
}

export function emptyPrePmfSimilarServices(): PrePmfSimilarServices {
  return { status: "idle", items: [], sources: [] };
}

export function defaultPrePmfOverview(): PrePmfOverviewData {
  return {
    problemStatement: "",
    targetUsers: [],
    stakeholders: [],
    marketSize: emptyPrePmfSection(),
    industryLandscape: emptyPrePmfSection(),
    competitiveLandscape: emptyPrePmfSection(),
    similarServices: emptyPrePmfSimilarServices(),
    businessModel: "",
    nextSteps: [],
    solution: "",
    valueProposition: emptyPrePmfSection(),
    keyFeatures: emptyPrePmfSection(),
    reachableMarket: emptyPrePmfSection(),
    marketStats: [],
    revenueModel: emptyPrePmfSection(),
    requiredTechnology: emptyPrePmfSection(),
    technologyItems: [],
    risks: [],
    verdict: emptyPrePmfVerdict(),
    lensClassificationNotes: {},
    researchLenses: {},
    lensBodies: {},
    researchInteractionId: "",
    sourceProblem: "",
    generatedAt: "",
    generationStatus: "idle",
  };
}

/** 4-Lens 캔버스 렌즈 순차 로딩 문구 — @see usePrePmfLensReveal */
export const PRE_PMF_GENERATION_PROGRESS_STEPS = [
  "가치 제안·타겟 사용자를 정리하고 있어요.",
  "연관 시장 환경을 정리하고 있어요.",
  "수익 모델을 정리하고 있어요.",
  "현재 행태·우회로를 조사하고 있어요.",
  "Pre-PMF 판단 신호를 정리하고 있어요.",
] as const;

export function resolvePrePmfGenerationStepMessage(progress: number): string {
  const steps = PRE_PMF_GENERATION_PROGRESS_STEPS;
  const bucket = 100 / steps.length;
  const idx = Math.min(steps.length - 1, Math.floor(progress / bucket));
  return steps[idx]!;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function readableBody(text: string): string {
  const t = text.trim();
  if (!t) return "";
  return normalizePrePmfReadableBody(t);
}

function clampStageId(v: unknown): number {
  const n =
    typeof v === "number"
      ? v
      : Number.parseInt(typeof v === "string" ? v.trim() : "", 10);
  if (!Number.isFinite(n) || n < 1 || n > STAGE_COUNT) return 0;
  return Math.round(n);
}

function inferStageIdFromDescription(text: string): number {
  const t = text.trim();
  if (!t) return 3;
  if (/시제품|프로토타입/.test(t)) return 11;
  if (/컨셉|concept/i.test(t)) return 10;
  if (/우선순위/.test(t)) return 9;
  if (/아이디어|ideation|scamper/i.test(t)) return 8;
  if (/hmw|how might/i.test(t)) return 7;
  if (/여정|journey/i.test(t)) return 6;
  if (/니즈|필요|잠재/.test(t)) return 5;
  if (/공감|발견 정리|인터뷰 분석/.test(t)) return 4;
  if (/사용자 조사|현장|인터뷰|to-know|토노우/i.test(t)) return 3;
  return 3;
}

function parseLegacyNextStep(text: string): PrePmfNextActivitySuggestion {
  const trimmed = text.trim();
  const stagePrefix = trimmed.match(/^(\d{1,2})\s*단계/);
  if (stagePrefix) {
    const stageId = clampStageId(Number(stagePrefix[1])) || 3;
    const description = trimmed
      .replace(/^\d{1,2}\s*단계\s*[·\-—:：]?\s*[^—:：\n]+[—:：]?\s*/u, "")
      .trim();
    return {
      stageId,
      description: description || trimmed,
    };
  }
  return {
    stageId: inferStageIdFromDescription(trimmed),
    description: trimmed,
  };
}

/** 사이드바와 동일한 단계 활동명 */
export function prePmfNextActivityStageLabel(stageId: number): string {
  return (
    getSidebarStage(stageId)?.navLabel?.trim() || `단계 ${stageId} 활동`
  );
}

export function formatPrePmfNextActivityRef(stageId: number): string {
  return `${stageId}단계 · ${prePmfNextActivityStageLabel(stageId)}`;
}

export function normalizePrePmfNextActivities(
  v: unknown,
  max = 8,
): PrePmfNextActivitySuggestion[] {
  if (!Array.isArray(v)) return [];
  const out: PrePmfNextActivitySuggestion[] = [];
  for (const raw of v) {
    if (typeof raw === "string") {
      const text = raw.trim();
      if (text) out.push(parseLegacyNextStep(text));
      continue;
    }
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    let stageId = clampStageId(o.stageId ?? o.stage);
    const description = asString(
      o.description ?? o.task ?? o.body ?? o.text,
    ).trim();
    if (!description) continue;
    if (!stageId) stageId = inferStageIdFromDescription(description);
    out.push({
      stageId,
      description: readableBody(description),
    });
    if (out.length >= max) break;
  }
  return out;
}

/** 단계 3 To-know unknowns 등 문자열 목록이 필요한 소비처용 */
export function prePmfNextActivityUnknowns(
  steps: PrePmfNextActivitySuggestion[],
): string[] {
  return steps.map(
    (s) => `${formatPrePmfNextActivityRef(s.stageId)} — ${s.description}`,
  );
}

export function emptyPrePmfVerdict(): PrePmfVerdict {
  return {
    decision: "",
    rationale: "",
    goActivities: [],
    hypothesisActivities: [],
    loopBackActivities: [],
  };
}

/** 판단 경로별 기본 활동 (AI·레거시 데이터 없을 때) */
export const DEFAULT_VERDICT_PATH_ACTIVITIES: Record<
  PrePmfVerdictPath,
  PrePmfNextActivitySuggestion[]
> = {
  go: [
    {
      stageId: 3,
      description: "첫 고객 100명을 만나 핵심 가설을 빠르게 검증해요.",
    },
    {
      stageId: 8,
      description: "검증된 니즈를 바탕으로 실행 가능한 아이디어를 구체화해요.",
    },
    {
      stageId: 11,
      description: "최소 시제품으로 시장 반응을 확인해요.",
    },
  ],
  hypothesis_board: [
    {
      stageId: 3,
      description: "약한 렌즈부터 현장 인터뷰로 가설을 검증해요.",
    },
    {
      stageId: 4,
      description: "조사 결과를 공감·발견으로 정리해요.",
    },
    {
      stageId: 5,
      description: "잠재 니즈를 분리해 가설 보드를 보강해요.",
    },
  ],
  loop_back: [
    {
      stageId: 1,
      description: "문제 정의와 타겟 설정을 처음부터 다시 정리해요.",
    },
    {
      stageId: 2,
      description: "4개 렌즈로 문제·아이디어 방향을 재점검해요.",
    },
  ],
};

export function prePmfVerdictPathActivities(
  verdict: PrePmfVerdict,
  path: PrePmfVerdictPath,
): PrePmfNextActivitySuggestion[] {
  switch (path) {
    case "go":
      return verdict.goActivities;
    case "hypothesis_board":
      return verdict.hypothesisActivities;
    case "loop_back":
      return verdict.loopBackActivities;
  }
}

/**
 * verdict 경로별 활동을 보강하고, 단계 3 등 레거시 소비처용 nextSteps를 동기화합니다.
 */
export function finalizePrePmfVerdictAndNextSteps(
  verdict: PrePmfVerdict,
  legacyNextSteps: PrePmfNextActivitySuggestion[],
): { verdict: PrePmfVerdict; nextSteps: PrePmfNextActivitySuggestion[] } {
  let v: PrePmfVerdict = { ...verdict };

  if (legacyNextSteps.length && v.decision) {
    const path = v.decision as PrePmfVerdictPath;
    if (!prePmfVerdictPathActivities(v, path).length) {
      v = {
        ...v,
        goActivities:
          path === "go" ? legacyNextSteps : v.goActivities,
        hypothesisActivities:
          path === "hypothesis_board" ? legacyNextSteps : v.hypothesisActivities,
        loopBackActivities:
          path === "loop_back" ? legacyNextSteps : v.loopBackActivities,
      };
    }
  }

  const paths: PrePmfVerdictPath[] = ["go", "hypothesis_board", "loop_back"];
  for (const path of paths) {
    if (!prePmfVerdictPathActivities(v, path).length) {
      const defaults = DEFAULT_VERDICT_PATH_ACTIVITIES[path];
      v = {
        ...v,
        goActivities: path === "go" ? defaults : v.goActivities,
        hypothesisActivities:
          path === "hypothesis_board" ? defaults : v.hypothesisActivities,
        loopBackActivities:
          path === "loop_back" ? defaults : v.loopBackActivities,
      };
    }
  }

  const nextSteps =
    v.decision && (v.decision as PrePmfVerdictPath)
      ? prePmfVerdictPathActivities(v, v.decision as PrePmfVerdictPath)
      : legacyNextSteps.length
        ? legacyNextSteps
        : v.hypothesisActivities;

  return { verdict: v, nextSteps };
}

function normalizeSources(v: unknown, max = 8): PrePmfSourceRef[] {
  if (!Array.isArray(v)) return [];
  const out: PrePmfSourceRef[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const url = asString(o.url).trim();
    if (!url) continue;
    out.push({ title: asString(o.title).trim() || url, url });
    if (out.length >= max) break;
  }
  return out;
}

function normalizeStatus(v: unknown): PrePmfSectionStatus {
  return v === "loading" || v === "done" || v === "error" ? v : "idle";
}

export function normalizePrePmfSection(v: unknown): PrePmfSection {
  if (!v || typeof v !== "object") return emptyPrePmfSection();
  const o = v as Record<string, unknown>;
  const body = asString(o.body);
  return {
    status: normalizeStatus(o.status),
    body: body ? readableBody(body) : "",
    sources: normalizeSources(o.sources),
  };
}

function normalizeSimilarServices(v: unknown): PrePmfSimilarServices {
  if (!v || typeof v !== "object") return emptyPrePmfSimilarServices();
  const o = v as Record<string, unknown>;
  const items: SimilarServiceItem[] = Array.isArray(o.items)
    ? o.items
        .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === "object")
        .map((x): SimilarServiceItem => ({
          name: asString(x.name).trim(),
          region: x.region === "korea" ? "korea" : "global",
          note: asString(x.note).trim(),
          url: normalizeExternalUrl(asString(x.url)) || undefined,
        }))
        .filter((x) => x.name)
        .slice(0, PRE_PMF_MAX_SIMILAR_SERVICES)
    : [];
  return {
    status: normalizeStatus(o.status),
    items: filterSimilarServiceItemsWithNote(items),
    sources: normalizeSources(o.sources),
  };
}

/** To-know 조사 대상자로 쓸 수 있는 짧은 세그먼트·역할명인지 */
export function isPlausibleResearchSubjectLabel(label: string): boolean {
  const t = label.trim().replace(/^[·•\-*]\s*/, "");
  if (t.length < 2 || t.length > 28) return false;
  if (/「|」/.test(t)) return false;
  if (/[?？]/.test(t)) return false;
  if (/고\s*싶/u.test(t)) return false;
  if (/^(?:내|우리)\s/u.test(t)) return false;
  if (/(?:습니다|합니다|입니다|해요|돼요|이에요|예요)\.?$/u.test(t)) return false;
  // 특성 조각: "개성 있", "만족 없"
  if (/^[가-힣]{1,10}\s+있$/u.test(t)) return false;
  if (/^(?:을|를|이|가|은|는)\s/u.test(t)) return false;
  if (t.split(/\s+/).length > 4) return false;
  return true;
}

/** reason 불릿에서 역할·세그먼트 라벨 추출 */
export function deriveResearchSubjectLabelFromReason(reason: string): string {
  const lines = reason
    .split(/\n+/)
    .map((line) => line.replace(/^[·•\-*]\s*/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const roleMatch = line.match(
      /([가-힣]{2,14}(?:점주|사장|운영자|이용자|고객|창업자|멘토|직장인|학생|부모|세대|관계자|공급자|플랫폼))/u,
    );
    if (
      roleMatch?.[1] &&
      isPlausibleResearchSubjectLabel(roleMatch[1])
    ) {
      return roleMatch[1];
    }

    const head = line.split(/[—:：]/)[0]?.trim() ?? line;
    if (isPlausibleResearchSubjectLabel(head)) return head;

    const parsed = parseProfileItem(line);
    if (isPlausibleResearchSubjectLabel(parsed.segment)) {
      return parsed.segment;
    }
  }
  return "";
}

/** 레거시 string[] · 객체 배열 모두 수용 */
export function normalizePrePmfPersonItems(
  v: unknown,
  max = 8,
): PrePmfPersonItem[] {
  if (!Array.isArray(v)) return [];
  const out: PrePmfPersonItem[] = [];
  for (const raw of v) {
    if (typeof raw === "string") {
      const name = raw.trim();
      if (name) out.push({ name, reason: "" });
      continue;
    }
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const name = asString(o.name).trim();
    const reason = asString(o.reason ?? o.description ?? o.note).trim();
    if (!name && !reason) continue;
    out.push({
      name,
      reason: reason ? condensePrePmfPersonReason(readableBody(reason)) : "",
    });
    if (out.length >= max) break;
  }
  return out;
}

/** 가치 제안 렌즈 — reason 불릿을 한 문장으로 압축 */
export function condensePrePmfPersonReason(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^[·•\-*]\s*/, "").trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return lines[0] ?? trimmed.replace(/^[·•\-*]\s*/gm, "").trim();
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function koreanTopicMarker(noun: string): "는" | "은" {
  const last = noun.trim().slice(-1);
  if (!last || !/[가-힣]/.test(last)) return "는";
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "는";
  return code % 28 !== 0 ? "은" : "는";
}

/** 가치 제안 렌즈 — 대상(name)과 한 문장 프로필(reason) 결합 */
export function prePmfPersonValueSentence(item: PrePmfPersonItem): string {
  const name = item.name.trim();
  const reason = condensePrePmfPersonReason(item.reason);
  if (!reason && !name) return "";
  if (!name) return reason;
  if (!reason) return name;

  if (reason.startsWith(name)) return reason;
  if (new RegExp(`^${name}[는은이가]`).test(reason)) return reason;

  const marker = koreanTopicMarker(name);
  return `${name}${marker} ${reason}`;
}

/** 사용자가 한 문장으로 편집한 값 → person 항목 저장 */
export function prePmfPersonItemFromSentence(sentence: string): PrePmfPersonItem {
  return { name: "", reason: sentence.trim() };
}

/** 가치 제안 한 문장 — 대상명·나머지 본문 분리 (강조 표시용) */
export function splitPrePmfPersonValueSentence(
  sentence: string,
  item?: PrePmfPersonItem,
): { subject: string; rest: string } {
  const text = sentence.trim();
  if (!text) return { subject: "", rest: "" };

  const storedName = item?.name.trim();
  if (storedName && text.startsWith(storedName)) {
    const tail = text.slice(storedName.length);
    const markerMatch = tail.match(/^([는은이가에게]\s*)/);
    if (markerMatch) {
      return { subject: storedName, rest: markerMatch[1] + tail.slice(markerMatch[1].length) };
    }
  }

  const match = text.match(/^(.+?)([는은이가]|에게)\s+/);
  if (match) {
    return {
      subject: match[1]!.trim(),
      rest: match[2]! + " " + text.slice(match[0].length),
    };
  }

  return { subject: "", rest: text };
}

const PMF_MARKET_STAT_STOPWORDS = new Set([
  "시장",
  "규모",
  "성장",
  "성장률",
  "국내",
  "글로벌",
  "연평균",
  "출처",
  "예상",
  "추정",
  "전망",
  "규모는",
  "규모가",
  "market",
  "size",
  "growth",
  "rate",
  "global",
  "korea",
  "cagr",
  "the",
  "and",
  "for",
]);

/** 웹검색·시장 통계 카드에 자주 끼어드는 무관 트렌드 시장 (입력에 AI 언급 없을 때 제외) */
const PMF_IRRELEVANT_MARKET_PATTERNS: RegExp[] = [
  /생성형\s*ai/i,
  /generative\s*ai/i,
  /\bgen\s*ai\b/i,
  /\bllm\b/i,
  /대규모\s*언어\s*모델/i,
  /foundation\s*model/i,
];

/** 사전 조사 웹검색용 — 문제·아이디어에서 핵심 주제만 추출 */
export function extractPrePmfSearchTopic(problem: string): string {
  const lines = problem
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  let topic = lines[0] ?? problem.trim();
  topic = topic.replace(/^초기\s*아이디어\s*[:：]\s*/i, "");
  return topic.slice(0, 160);
}

const PMF_INDUSTRY_SERVICE_WORD_RE =
  /정보|검색|추천|매칭|큐레이션|플랫폼|서비스|앱|어플|솔루션|도구|시스템|소프트웨어|saas|스타트업|온라인|디지털|ai|인공지능|gpt|챗봇/i;

function isIndustryServiceWord(token: string): boolean {
  return PMF_INDUSTRY_SERVICE_WORD_RE.test(token);
}

/** 렌즈2 산업 조사용 — 문제·아이디어 뒤에 깔린 실물·오프라인 산업 주제 추출 */
export function extractPrePmfIndustrySearchTopic(problem: string): string {
  const base = extractPrePmfSearchTopic(problem);
  const stripped = base
    .replace(PMF_INDUSTRY_SERVICE_WORD_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length >= 2) return stripped.slice(0, 100);

  const nouns = problem.match(/[가-힣]{2,}/g) ?? [];
  for (const noun of nouns) {
    if (PMF_MARKET_STAT_STOPWORDS.has(noun)) continue;
    if (isIndustryServiceWord(noun)) continue;
    return noun.slice(0, 100);
  }
  return base.slice(0, 100);
}

function domainTokensFromProblem(problem: string): string[] {
  const matches = problem.match(/[가-힣]{2,}|[a-z]{3,}/gi) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const token = raw.toLowerCase();
    if (PMF_MARKET_STAT_STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

function problemMentionsAiDomain(problem: string): boolean {
  return /ai|인공지능|생성형|llm|머신러닝|딥러닝|gpt|chatbot|챗봇/i.test(problem);
}

/**
 * 입력과 무관한 시장 통계(예: 생성형 AI 시장) 제거.
 * artifact 로드·AI 생성 직후 모두 적용합니다.
 */
export function sanitizePrePmfMarketStats(
  problem: string,
  stats: PrePmfStatCard[],
): PrePmfStatCard[] {
  if (!stats.length) return [];

  const aiDomain = problemMentionsAiDomain(problem);
  const domainTokens = domainTokensFromProblem(problem);

  return stats.filter((stat) => {
    const labelValue = `${stat.label} ${stat.value}`.toLowerCase();

    if (!aiDomain) {
      for (const pattern of PMF_IRRELEVANT_MARKET_PATTERNS) {
        if (pattern.test(labelValue)) return false;
      }
    }

    if (!domainTokens.length) return true;

    const hasDomainOverlap = domainTokens.some(
      (token) => token.length >= 2 && labelValue.includes(token),
    );
    return hasDomainOverlap;
  });
}

/** 사전 조사 화면·To-know 조사 대상자 — name 필드를 그대로 사용 */
export function prePmfPersonDisplayName(
  item: PrePmfPersonItem,
  index: number,
  fallbackPrefix = "대상",
): string {
  const name = item.name.trim();
  if (name) return name;
  const derived = deriveResearchSubjectLabelFromReason(item.reason);
  if (derived) return derived;
  return `${fallbackPrefix} ${index + 1}`;
}

/** 사전 조사 person 항목 → 표시·To-know용 라벨 목록 (name 우선, 중복 제거) */
export function prePmfPersonDisplayLabels(
  items: PrePmfPersonItem[],
  fallbackPrefix = "대상",
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const label = prePmfPersonDisplayName(items[i]!, i, fallbackPrefix);
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/** To-know 조사 대상자 — 예상 타겟 사용자 + 이해관계자 (사전 조사 순서 유지) */
export function prePmfToKnowResearchSubjects(
  targetUsers: PrePmfPersonItem[],
  stakeholders: PrePmfPersonItem[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (label: string) => {
    const t = label.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  for (const label of prePmfPersonDisplayLabels(targetUsers, "타겟")) {
    push(label);
  }
  for (const label of prePmfPersonDisplayLabels(stakeholders, "이해관계자")) {
    push(label);
  }
  return out;
}

/** To-know·조사 대상자용 — 세그먼트·역할 라벨만 (문장 조각 제외) */
export function prePmfResearchSubjectLabels(
  items: PrePmfPersonItem[],
): string[] {
  return prePmfPersonDisplayLabels(items);
}

export function prePmfPersonLabels(items: PrePmfPersonItem[]): string[] {
  return prePmfPersonDisplayLabels(items);
}

export function normalizePrePmfOverview(raw: unknown): PrePmfOverviewData {
  const base = defaultPrePmfOverview();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const legacyNextSteps = normalizePrePmfNextActivities(o.nextSteps);
  const verdictRaw = normalizePrePmfVerdict(o.verdict);
  const { verdict, nextSteps } = finalizePrePmfVerdictAndNextSteps(
    verdictRaw,
    legacyNextSteps,
  );
  const sourceProblem = asString(o.sourceProblem);
  const problemStatement = readableBody(asString(o.problemStatement));
  const marketStatsRaw = normalizePrePmfStatCards(o.marketStats);
  const problemContext =
    sourceProblem.trim() || problemStatement.trim();
  return {
    problemStatement,
    targetUsers: normalizePrePmfPersonItems(o.targetUsers),
    stakeholders: normalizePrePmfPersonItems(o.stakeholders),
    marketSize: normalizePrePmfSection(o.marketSize),
    industryLandscape: normalizePrePmfSection(o.industryLandscape),
    competitiveLandscape: normalizePrePmfSection(o.competitiveLandscape),
    similarServices: normalizeSimilarServices(o.similarServices),
    businessModel: readableBody(asString(o.businessModel)),
    nextSteps,
    solution: readableBody(asString(o.solution)),
    valueProposition: normalizePrePmfSection(o.valueProposition),
    keyFeatures: normalizePrePmfSection(o.keyFeatures ?? o.reachableMarket),
    reachableMarket: normalizePrePmfSection(o.reachableMarket),
    marketStats: sanitizePrePmfMarketStats(problemContext, marketStatsRaw),
    revenueModel: normalizePrePmfSection(o.revenueModel),
    requiredTechnology: normalizePrePmfSection(o.requiredTechnology),
    technologyItems: normalizePrePmfTechnologyItems(o.technologyItems),
    risks: normalizePrePmfRisks(o.risks),
    verdict,
    lensClassificationNotes: normalizeLensClassificationNotes(
      o.lensClassificationNotes,
    ),
    researchLenses: normalizeResearchLenses(o.researchLenses),
    lensBodies: normalizeLensBodies(o.lensBodies),
    researchInteractionId: asString(o.researchInteractionId),
    sourceProblem,
    generatedAt: asString(o.generatedAt),
    generationStatus: normalizeStatus(o.generationStatus),
  };
}

/* ----------------------- 5-Lens 정규화·파생 헬퍼 ----------------------- */

const PRE_PMF_RISK_AXES: PrePmfRiskAxis[] = ["market", "execution", "financial"];

function asConfidence(v: unknown): PrePmfConfidence {
  return v === "fact" ? "fact" : "hypothesis";
}

export function normalizePrePmfStatCards(
  v: unknown,
  max = 4,
): PrePmfStatCard[] {
  if (!Array.isArray(v)) return [];
  const out: PrePmfStatCard[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const label = asString(o.label).trim();
    const value = asString(o.value).trim();
    if (!label && !value) continue;
    out.push({ label, value, source: asString(o.source).trim() });
    if (out.length >= max) break;
  }
  return out;
}

export function normalizePrePmfTechnologyItems(
  v: unknown,
  max = PRE_PMF_MAX_TECHNOLOGY_ITEMS,
): PrePmfTechnologyItem[] {
  if (!Array.isArray(v)) return [];
  const out: PrePmfTechnologyItem[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const name = asString(o.name).trim();
    const note = readableBody(asString(o.note ?? o.reason));
    if (!name) continue;
    out.push({ name, note });
    if (out.length >= max) break;
  }
  return out;
}

export function normalizePrePmfRisks(v: unknown): PrePmfRiskItem[] {
  if (!Array.isArray(v)) return [];
  const byAxis = new Map<PrePmfRiskAxis, PrePmfRiskItem>();
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const axisRaw = asString(o.axis).trim().toLowerCase();
    const axis = PRE_PMF_RISK_AXES.find((a) => a === axisRaw);
    const body = readableBody(asString(o.body));
    if (!axis || !body) continue;
    if (!byAxis.has(axis)) {
      byAxis.set(axis, { axis, body, confidence: asConfidence(o.confidence) });
    }
  }
  // 항상 3축 순서 유지 (없는 축은 제외하지 않고 호출부에서 빈 표시)
  return PRE_PMF_RISK_AXES.filter((a) => byAxis.has(a)).map(
    (a) => byAxis.get(a)!,
  );
}

export function normalizePrePmfVerdict(v: unknown): PrePmfVerdict {
  if (!v || typeof v !== "object") return emptyPrePmfVerdict();
  const o = v as Record<string, unknown>;
  const d = asString(o.decision).trim().toLowerCase();
  const decision: PrePmfVerdictDecision =
    d === "go" || d === "hypothesis_board" || d === "loop_back" ? d : "";
  return {
    decision,
    rationale: readableBody(asString(o.rationale)),
    goActivities: normalizePrePmfNextActivities(
      o.goActivities ?? o.goSteps,
      5,
    ),
    hypothesisActivities: normalizePrePmfNextActivities(
      o.hypothesisActivities ?? o.hypothesisBoardActivities ?? o.hypothesisSteps,
      5,
    ),
    loopBackActivities: normalizePrePmfNextActivities(
      o.loopBackActivities ?? o.loopBackSteps,
      5,
    ),
  };
}

/** 섹션에 URL 출처가 있으면 fact, 없으면 hypothesis */
export function prePmfSectionConfidence(
  section: { sources: PrePmfSourceRef[] } | null | undefined,
): PrePmfConfidence {
  return section?.sources?.some((s) => s.url.trim()) ? "fact" : "hypothesis";
}

export type PrePmfLensFooterKind = "hypothesis";

export interface PrePmfLensFooterNote {
  kind: PrePmfLensFooterKind;
  text: string;
}

/** 가설 렌즈 기본 설명 — AI note 없을 때 */
export const PRE_PMF_DEFAULT_HYPOTHESIS_LENS_REASONS: Record<
  PrePmfLensId,
  string
> = {
  value_proposition:
    "고객 니즈와 제공 가치가 인터뷰·현장 조사로 아직 확인되지 않았어요.",
  key_features:
    "실물 산업·디지털 시장 정보가 아직 가설이며, 현장·자료로 더 확인이 필요해요.",
  current_alternatives:
    "경쟁·대안 정보가 제한적이거나 실제 사용 맥락 검증이 더 필요해요.",
  market_environment:
    "수익 모델이 아이디어 검증 전 가설 단계이며, 고객 지불 의사 확인이 필요해요.",
  required_technology:
    "시장·실행·재무 리스크가 가설 단계이며, 약한 렌즈부터 보강이 필요해요.",
};

function lensDetailHasContent(d: PrePmfLensDetail): boolean {
  return [d.targetUsers, d.currentBehavior, d.marketEnvironment, d.judgmentResult].some(
    (s) => s.trim().length > 0,
  );
}

function normalizeLensDetailField(v: unknown): string {
  return readableBody(asString(v));
}

function normalizeLensDetail(raw: unknown): PrePmfLensDetail | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const detail: PrePmfLensDetail = {
    targetUsers: normalizeLensDetailField(o.targetUsers),
    currentBehavior: normalizeLensDetailField(
      o.currentBehavior ?? o.current_behavior,
    ),
    marketEnvironment: normalizeLensDetailField(
      o.marketEnvironment ?? o.market_environment,
    ),
    judgmentResult: normalizeLensDetailField(
      o.judgmentResult ?? o.judgment_result,
    ),
  };
  return lensDetailHasContent(detail) ? detail : null;
}

export function normalizeResearchLenses(
  v: unknown,
): Partial<Record<PrePmfLensId, PrePmfLensDetail>> {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: Partial<Record<PrePmfLensId, PrePmfLensDetail>> = {};
  for (const id of PRE_PMF_LENS_IDS) {
    const detail = normalizeLensDetail(o[id]);
    if (detail) out[id] = detail;
  }
  return out;
}

export function normalizeLensBodies(
  v: unknown,
): Partial<Record<PrePmfLensId, string>> {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: Partial<Record<PrePmfLensId, string>> = {};
  for (const id of PRE_PMF_LENS_IDS) {
    const body = readableBody(asString(o[id]));
    if (body) out[id] = body;
  }
  return out;
}

function formatPersonItemsBullets(items: PrePmfPersonItem[]): string {
  return items
    .map((item) => {
      const sentence = prePmfPersonValueSentence(item);
      return sentence ? `· ${sentence}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatSimilarServicesBullets(items: SimilarServiceItem[]): string {
  return items
    .map((s) => {
      const region = s.region === "korea" ? "한국" : "글로벌";
      const note = s.note.trim();
      return note
        ? `· ${s.name}(${region}) — ${note}`
        : `· ${s.name}(${region})`;
    })
    .join("\n");
}

function formatLensJudgment(
  lensId: PrePmfLensId,
  data: PrePmfOverviewData,
  confidence: PrePmfConfidence,
  lensBody = "",
): string {
  const parts: string[] = [];
  const body = lensBody.trim();
  if (body) parts.push(body);
  const note = data.lensClassificationNotes[lensId]?.trim();
  if (confidence === "fact") {
    parts.push(
      "· 웹 자료 등으로 일부 근거가 확보됐어요. 현장 검증으로 보강하면 좋아요.",
    );
  } else if (note) {
    parts.push(`· ${note}`);
  } else {
    parts.push(`· ${PRE_PMF_DEFAULT_HYPOTHESIS_LENS_REASONS[lensId]}`);
  }
  return parts.join("\n");
}

/** 렌즈2 — 연관 시장 환경 리포트 본문 (산업·서비스 시장·지표) */
export function formatPrePmfMarketEnvironmentReportBody(
  data: PrePmfOverviewData,
  detail?: PrePmfLensDetail,
): string {
  const industryBody = readableBody(data.industryLandscape.body);
  const serviceMarketBody = readableBody(data.marketSize.body);
  const statsLines = data.marketStats
    .map((s) => {
      const label = s.label.trim();
      const value = s.value.trim();
      if (!label && !value) return "";
      return value ? `· ${label}: ${value}` : `· ${label}`;
    })
    .filter(Boolean)
    .join("\n");

  const fromDetail = detail?.marketEnvironment.trim();
  if (fromDetail) {
    const parts = [fromDetail];
    if (industryBody && !fromDetail.includes(industryBody.slice(0, 24))) {
      parts.unshift(`[산업·실물 경제]\n${industryBody}`);
    }
    if (serviceMarketBody && !fromDetail.includes(serviceMarketBody.slice(0, 24))) {
      parts.push(`[디지털·서비스 시장]\n${serviceMarketBody}`);
    }
    if (statsLines) parts.push(`[주요 지표]\n${statsLines}`);
    return parts.filter(Boolean).join("\n\n");
  }

  const sections: string[] = [];
  if (industryBody) {
    sections.push(`[산업·실물 경제]\n${industryBody}`);
  }
  if (serviceMarketBody) {
    sections.push(`[디지털·서비스 시장]\n${serviceMarketBody}`);
  }
  if (statsLines) {
    sections.push(`[주요 지표]\n${statsLines}`);
  }
  if (sections.length) return sections.join("\n\n");

  return [
    "· 문제·아이디어와 연결된 실물 산업(예: 카페·외식·유통)이 어떻게 형성돼 있는지 정리해 주세요.",
    "· 디지털·서비스 시장 규모·성장률·최근 흐름도 함께 보면 좋아요.",
  ].join("\n");
}

/** 렌즈 카드 4필드 — researchLenses 우선, 없으면 기존 섹션에서 파생 */
export function resolvePrePmfLensDetail(
  lensId: PrePmfLensId,
  data: PrePmfOverviewData,
  similarItems: SimilarServiceItem[] = [],
): PrePmfLensDetail {
  const stored = data.researchLenses[lensId];
  if (stored && lensDetailHasContent(stored)) {
    return {
      targetUsers: readableBody(stored.targetUsers),
      currentBehavior: readableBody(stored.currentBehavior),
      marketEnvironment: readableBody(stored.marketEnvironment),
      judgmentResult: readableBody(stored.judgmentResult),
    };
  }

  const targetBullets = formatPersonItemsBullets(data.targetUsers);
  const marketBody = data.marketSize.body.trim();
  const altBody = data.competitiveLandscape.body.trim();
  const similarBullets = formatSimilarServicesBullets(similarItems);
  const altConfidence: PrePmfConfidence = similarItems.some((s) => s.url?.trim())
    ? "fact"
    : prePmfSectionConfidence(data.competitiveLandscape);
  const marketConfidence: PrePmfConfidence =
    prePmfSectionConfidence(data.marketSize) === "fact" ||
    prePmfSectionConfidence(data.industryLandscape) === "fact" ||
    data.marketStats.length > 0
      ? "fact"
      : "hypothesis";

  switch (lensId) {
    case "value_proposition":
      return {
        targetUsers: targetBullets,
        currentBehavior: altBody,
        marketEnvironment: marketBody,
        judgmentResult: formatLensJudgment(
          lensId,
          data,
          prePmfSectionConfidence(data.valueProposition),
          data.valueProposition.body,
        ),
      };
    case "current_alternatives":
      return {
        targetUsers: targetBullets,
        currentBehavior: [altBody, similarBullets].filter(Boolean).join("\n"),
        marketEnvironment: marketBody,
        judgmentResult: formatLensJudgment(lensId, data, altConfidence),
      };
    case "key_features": {
      const envBody = formatPrePmfMarketEnvironmentReportBody(data);
      return {
        targetUsers: "",
        currentBehavior: "",
        marketEnvironment: envBody,
        judgmentResult: formatLensJudgment(lensId, data, marketConfidence),
      };
    }
    case "market_environment": {
      const revenueBody =
        data.businessModel.trim() || marketBody;
      return {
        targetUsers: targetBullets,
        currentBehavior: altBody,
        marketEnvironment: revenueBody,
        judgmentResult: formatLensJudgment(
          lensId,
          data,
          data.businessModel.trim() ? "fact" : marketConfidence,
        ),
      };
    }
    case "required_technology": {
      const riskLines = data.risks
        .map((r) => `· ${r.body}`)
        .join("\n");
      const riskBody = [riskLines, data.requiredTechnology.body.trim()]
        .filter(Boolean)
        .join("\n");
      return {
        targetUsers: targetBullets,
        currentBehavior: altBody,
        marketEnvironment: marketBody,
        judgmentResult: formatLensJudgment(
          lensId,
          data,
          data.risks.length > 0 ? "fact" : "hypothesis",
          riskBody,
        ),
      };
    }
    default:
      return {
        targetUsers: targetBullets,
        currentBehavior: altBody,
        marketEnvironment: marketBody,
        judgmentResult: "",
      };
  }
}

/** 리포트 카드용 렌즈 본문 — 시안처럼 한 덩어리 불릿 텍스트 */
export function resolvePrePmfLensReportBody(
  lensId: PrePmfLensId,
  data: PrePmfOverviewData,
  detail: PrePmfLensDetail,
): string {
  const override = data.lensBodies?.[lensId];
  if (override && override.trim()) return override;

  const stored = data.researchLenses[lensId];
  if (stored && lensDetailHasContent(stored)) {
    if (lensId === "key_features") {
      return formatPrePmfMarketEnvironmentReportBody(data, {
        ...stored,
        marketEnvironment:
          stored.marketEnvironment.trim() ||
          formatPrePmfMarketEnvironmentReportBody(data),
      });
    }
    return [
      stored.targetUsers,
      stored.currentBehavior,
      stored.marketEnvironment,
      stored.judgmentResult,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n");
  }

  switch (lensId) {
    case "value_proposition":
      return [detail.targetUsers, data.valueProposition.body.trim()]
        .filter(Boolean)
        .join("\n");
    case "key_features":
      return formatPrePmfMarketEnvironmentReportBody(data, detail);
    case "current_alternatives":
      return detail.currentBehavior;
    case "market_environment":
      return data.businessModel.trim() || detail.marketEnvironment;
    case "required_technology":
      return detail.judgmentResult;
    default:
      return "";
  }
}

export function normalizeLensClassificationNotes(
  v: unknown,
): Partial<Record<PrePmfLensId, string>> {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: Partial<Record<PrePmfLensId, string>> = {};
  for (const id of PRE_PMF_LENS_IDS) {
    const legacyKey =
      id === "key_features"
        ? "reachable_market"
        : id === "market_environment"
          ? "revenue_model"
          : id === "required_technology"
            ? "risk_triangle"
            : id;
    const text = readableBody(asString(o[id] ?? o[legacyKey]));
    if (text) out[id] = text;
  }
  return out;
}

/** 렌즈 카드 하단 분류 설명 — 가설일 때만 */
export function resolvePrePmfLensFooterNote(
  lensId: PrePmfLensId,
  data: PrePmfOverviewData,
  confidence: PrePmfConfidence,
): PrePmfLensFooterNote | null {
  if (confidence === "hypothesis") {
    return {
      kind: "hypothesis",
      text:
        data.lensClassificationNotes[lensId]?.trim() ||
        PRE_PMF_DEFAULT_HYPOTHESIS_LENS_REASONS[lensId],
    };
  }
  return null;
}

/** 리포트가 생성 완료되었거나, 렌즈 1을 수동으로 채워 다음 단계로 넘어갈 수 있는지 */
export function prePmfGatePassed(data: PrePmfOverviewData): boolean {
  const hasValueLensContent =
    data.targetUsers.some((u) => u.name.trim() || u.reason.trim()) ||
    data.valueProposition.body.trim().length > 0;
  const hasProblem =
    data.problemStatement.trim().length > 0 || hasValueLensContent;
  return hasProblem && (data.generationStatus === "done" || hasValueLensContent);
}

/** 경쟁 현황 서술에서 경쟁자/대안 후보 라벨 추출 (단계 3 매핑용) */
export function extractCompetitorLabels(data: PrePmfOverviewData): string[] {
  const labels = new Set<string>();
  for (const s of data.similarServices.items) {
    if (s.name) labels.add(s.name);
  }
  const body = data.competitiveLandscape.body;
  for (const line of body.split(/\n+/)) {
    const trimmed = line.replace(/^[·\-*\s]+/, "").trim();
    if (!trimmed) continue;
    // 「이름 — 설명」 또는 「이름: 설명」 형태에서 앞부분만
    const head = trimmed.split(/[—:：]/)[0]?.trim();
    if (head && head.length <= 30) labels.add(head);
  }
  return [...labels].slice(0, 10);
}

/** 코치·단계 3 컨텍스트용 요약 텍스트 */
export function buildPrePmfSummaryText(data: PrePmfOverviewData): string {
  const lines: string[] = [];
  if (data.problemStatement.trim()) {
    lines.push(`문제 정의: ${data.problemStatement.trim()}`);
  }
  if (data.targetUsers.length) {
    lines.push(
      `예상 타겟: ${data.targetUsers
        .map((u) => (u.reason ? `${u.name} — ${u.reason}` : u.name))
        .join(" | ")}`,
    );
  }
  if (data.stakeholders.length) {
    lines.push(
      `이해관계자: ${data.stakeholders
        .map((s) => (s.reason ? `${s.name} — ${s.reason}` : s.name))
        .join(" | ")}`,
    );
  }
  if (data.industryLandscape.body.trim()) {
    lines.push(
      `산업·실물 경제: ${data.industryLandscape.body.trim().slice(0, 300)}`,
    );
  }
  if (data.marketSize.body.trim()) {
    lines.push(`시장 규모·성장률: ${data.marketSize.body.trim().slice(0, 300)}`);
  }
  if (data.competitiveLandscape.body.trim()) {
    lines.push(`경쟁 현황: ${data.competitiveLandscape.body.trim().slice(0, 300)}`);
  }
  if (data.similarServices.items.length) {
    lines.push(
      `유사 서비스: ${data.similarServices.items
        .map((s) => `${s.name}(${s.region === "korea" ? "한국" : "글로벌"})`)
        .join(", ")}`,
    );
  }
  if (data.businessModel.trim()) {
    lines.push(`비즈니스 모델: ${data.businessModel.trim().slice(0, 200)}`);
  }
  if (data.nextSteps.length) {
    lines.push(
      `다음 활동 제안: ${prePmfNextActivityUnknowns(data.nextSteps).join(" / ")}`,
    );
  }
  return lines.join("\n");
}

/** 출처가 하나라도 있으면 discovery, 아니면 hypothesis */
export function prePmfHasSources(data: PrePmfOverviewData): boolean {
  return (
    data.marketSize.sources.length > 0 ||
    data.industryLandscape.sources.length > 0 ||
    data.competitiveLandscape.sources.length > 0 ||
    data.similarServices.sources.length > 0
  );
}

/** API 폴백(heuristicFallback)으로 저장된 템플릿 결과인지 */
export function isPrePmfHeuristicPlaceholder(data: PrePmfOverviewData): boolean {
  if (data.generationStatus !== "done") return false;
  const blob = [
    data.problemStatement,
    ...data.targetUsers.map((u) => u.reason),
    data.marketSize.body,
    data.competitiveLandscape.body,
  ].join("\n");
  return (
    blob.includes(
      "입력하신 문제 상황에서 불편을 직접 겪는 사람으로 추정",
    ) &&
    blob.includes("관련 시장 규모는 공개 자료로 추가 확인이 필요") &&
    !prePmfHasSources(data) &&
    data.similarServices.items.length === 0
  );
}

/** 저장된 결과를 그대로 쓸지, 1단계 입력 기준으로 다시 생성할지 */
export function prePmfNeedsRegeneration(
  data: PrePmfOverviewData,
  startingPoint: string,
): boolean {
  if (data.generationStatus !== "done") return false;
  if (isPrePmfHeuristicPlaceholder(data)) return true;
  const src = data.sourceProblem.trim();
  const point = startingPoint.trim();
  if (point && src && src !== point) return true;
  return false;
}
