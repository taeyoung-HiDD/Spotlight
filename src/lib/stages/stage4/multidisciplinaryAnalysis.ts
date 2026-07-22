/** 다학제적 분석(Multi-disciplinary Analysis) — 조사 결과 전문가 렌즈 */

export type MultidisciplinaryExpertId =
  | "anthropologist"
  | "architect"
  | "product_designer"
  | "marketer"
  | "strategist"
  | "consultant"
  | "engineer"
  | "psychologist"
  | "hci_researcher";

export interface MultidisciplinaryExpertDef {
  id: MultidisciplinaryExpertId;
  labelEn: string;
  labelKo: string;
  lens: string;
  /** 근원·배경을 파고들 때 필수 출력 질문 */
  rootProbe: string;
}

/** 인간 이해·공감·내면 욕구를 보기 위한 전문가 풀 */
export const MULTIDISCIPLINARY_EXPERTS: MultidisciplinaryExpertDef[] = [
  {
    id: "anthropologist",
    labelEn: "Anthropologist",
    labelKo: "인류학자",
    lens: "역사·전통 · 인종 · 문화 · 일상 실천",
    rootProbe: "문화적으로 ‘말해서는 안 되는’ 규범·체면이 이 침묵을 만드나요?",
  },
  {
    id: "architect",
    labelEn: "Architect",
    labelKo: "건축가",
    lens: "공간 · 동선 · 환경이 행동에 주는 영향",
    rootProbe: "공간이 강제하는 보이지 않는 비용·마찰은 무엇인가요?",
  },
  {
    id: "product_designer",
    labelEn: "Product Designer",
    labelKo: "프로덕트 디자이너",
    lens: "경험 · 터치포인트 · 사용 맥락",
    rootProbe: "경험 흐름 어디에서 ‘말하기 어려운 불편’이 설계로 떠넘겨지나요?",
  },
  {
    id: "marketer",
    labelEn: "Marketer",
    labelKo: "마케터",
    lens: "메시지 · 세그먼트 · 동기·장벽",
    rootProbe: "표면 동기 뒤에 숨은 진짜 장벽·정체성 신호는 무엇인가요?",
  },
  {
    id: "strategist",
    labelEn: "Strategist",
    labelKo: "전략가",
    lens: "포지셔닝 · 기회 · 우선순위",
    rootProbe: "이 근원 가설이 기회라면, 어떤 우선순위로 검증해야 하나요?",
  },
  {
    id: "consultant",
    labelEn: "Consultant",
    labelKo: "컨설턴트",
    lens: "문제 구조화 · 이해관계자 · 실행 조건",
    rootProbe: "이해관계자 권력 구조가 무엇을 침묵시키나요?",
  },
  {
    id: "engineer",
    labelEn: "Engineer",
    labelKo: "엔지니어",
    lens: "기술 가능성 · 제약 · 시스템 마찰",
    rootProbe: "시스템·기술 제약이 사용자 탓으로 떠넘겨지는 지점은?",
  },
  {
    id: "psychologist",
    labelEn: "Psychologist",
    labelKo: "심리학자",
    lens: "감정 · 인지 · 내면 욕구 · 방어",
    rootProbe: "방어·수치·자기합리화가 막는 근원 욕구·두려움은?",
  },
  {
    id: "hci_researcher",
    labelEn: "HCI Researcher",
    labelKo: "HCI 연구자",
    lens: "상호작용 · 사용성 · 인지 부하",
    rootProbe: "상호작용이 사용자 탓으로 떠넘기는 인지 부하·마찰은?",
  },
];

const EXPERT_BY_ID = new Map(
  MULTIDISCIPLINARY_EXPERTS.map((e) => [e.id, e] as const),
);

export function getMultidisciplinaryExpert(
  id: string,
): MultidisciplinaryExpertDef | null {
  return EXPERT_BY_ID.get(id as MultidisciplinaryExpertId) ?? null;
}

export interface MultidisciplinaryExpertInsight {
  expertId: MultidisciplinaryExpertId;
  expertLabelEn: string;
  expertLabelKo: string;
  lens: string;
  /** 해당 대상에 대한 전문가 발화 */
  analysis: string;
  /**
   * 대화 라운드 — 0: 첫 해설, 1~2: 다른 전문가 의견에 대한 반응
   * 전문가당 최대 3회(round 0·1·2)
   */
  round: number;
  /** 반응 시 주로 응답하는 상대 전문가 (선택) */
  reactsToExpertId?: MultidisciplinaryExpertId;
}

export interface MultidisciplinaryFollowUp {
  id: string;
  expertId: MultidisciplinaryExpertId;
  expertLabelKo: string;
  expertLabelEn: string;
  question: string;
  reply: string;
  createdAt: string;
}

/** AI 근원 가설 — 항상 hypothesis */
export type RootReadingConfidence = "hypothesis";

export type RootReadingLayerId =
  | "surfaceSaid"
  | "surfaceShown"
  | "tension"
  | "structuralBackground"
  | "latentRoot"
  | "whyUnspoken";

export interface RootReadingClaim {
  id: string;
  layer: RootReadingLayerId;
  text: string;
  /** Stage4 SynthesisNote.id */
  sourceRefs: string[];
  confidence: RootReadingConfidence;
}

export interface MultidisciplinaryRootReading {
  surfaceSaid: RootReadingClaim | null;
  surfaceShown: RootReadingClaim | null;
  tension: RootReadingClaim | null;
  structuralBackground: RootReadingClaim | null;
  latentRoot: RootReadingClaim | null;
  whyUnspoken: RootReadingClaim | null;
}

export type ProbeQuestionKind =
  | "tension"
  | "silence"
  | "structure"
  | "verify";

export interface MultidisciplinaryProbeQuestion {
  id: string;
  kind: ProbeQuestionKind;
  text: string;
  /** 추천 전문가 (선택) */
  suggestedExpertId?: MultidisciplinaryExpertId;
}

export type CrossSubjectPatternKind =
  | "shared_root"
  | "diverging_background"
  | "shared_unspoken";

export interface CrossSubjectPattern {
  id: string;
  kind: CrossSubjectPatternKind;
  text: string;
  subjectIds: string[];
  confidence: RootReadingConfidence;
}

export interface MultidisciplinarySubjectAnalysis {
  subjectId: string;
  subjectName: string;
  /** 발화 순서대로 — 같은 전문가가 round별로 여러 번 등장할 수 있음 */
  insights: MultidisciplinaryExpertInsight[];
  /** 사용자 ↔ 전문가 추가 Q&A (아티팩트에 저장) */
  followUps: MultidisciplinaryFollowUp[];
  /** 레이어드 근원 읽기 (가설) */
  rootReading: MultidisciplinaryRootReading | null;
  /** 근원 파고들기 가이드 질문 */
  probeQuestions: MultidisciplinaryProbeQuestion[];
  /** Stage5로 보낸 claim id */
  handedOffClaimIds: string[];
}

export interface MultidisciplinaryAnalysisData {
  generatedAt: string;
  /** 프로젝트 주제에 맞춰 선택된 전문가 id */
  selectedExpertIds: MultidisciplinaryExpertId[];
  /** 전체 한눈 요약 */
  overview: string;
  /** 다인 조사 교차 패턴 */
  patterns: CrossSubjectPattern[];
  bySubject: MultidisciplinarySubjectAnalysis[];
}

export const ROOT_READING_LAYER_META: Record<
  RootReadingLayerId,
  { label: string; hint: string }
> = {
  surfaceSaid: {
    label: "말한 문제",
    hint: "사용자가 직접 언급한 표면 문제",
  },
  surfaceShown: {
    label: "드러난 행동",
    hint: "관찰로 나타난 행동·환경",
  },
  tension: {
    label: "모순·공백",
    hint: "말과 행동·침묵 사이의 긴장",
  },
  structuralBackground: {
    label: "구조적 배경",
    hint: "제도·문화·공간·기술·관계 (가설)",
  },
  latentRoot: {
    label: "근원 욕구·두려움",
    hint: "표현하지 못하거나 인식하지 못한 것 (가설)",
  },
  whyUnspoken: {
    label: "말하기 어려운 이유",
    hint: "체면·낙인·권력·언어 부재·습관화 등 (가설)",
  },
};

export const PROBE_KIND_LABEL: Record<ProbeQuestionKind, string> = {
  tension: "모순",
  silence: "침묵",
  structure: "구조",
  verify: "검증",
};

export const PATTERN_KIND_LABEL: Record<CrossSubjectPatternKind, string> = {
  shared_root: "공통 근원",
  diverging_background: "갈라지는 배경",
  shared_unspoken: "공통 침묵",
};

export function emptyRootReading(): MultidisciplinaryRootReading {
  return {
    surfaceSaid: null,
    surfaceShown: null,
    tension: null,
    structuralBackground: null,
    latentRoot: null,
    whyUnspoken: null,
  };
}

export function emptyMultidisciplinaryAnalysis(): MultidisciplinaryAnalysisData {
  return {
    generatedAt: "",
    selectedExpertIds: [],
    overview: "",
    patterns: [],
    bySubject: [],
  };
}

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** LLM이 전문가 발화에 섞어 넣은 Kevin(진행자) 멘트를 제거 */
export function stripFacilitatorPhrasesFromExpertText(text: string): string {
  return text
    .replace(
      /(?:^|\n)\s*(?:여기서\s*)?(?:이제\s*)?서로의\s*의견에\s*한\s*마디씩\s*더해\s*(?:볼)?게요\.?\s*/g,
      "\n",
    )
    .replace(
      /(?:^|\n)\s*궁금한\s*점이\s*있으면[\s\S]{0,80}?이어서\s*물어보세요\.?\s*/g,
      "\n",
    )
    .replace(
      /(?:^|\n)\s*전문가들이\s*이어서\s*말씀해\s*주실\s*거예요\.?\s*/g,
      "\n",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeExpertId(raw: unknown): MultidisciplinaryExpertId | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim() as MultidisciplinaryExpertId;
  return EXPERT_BY_ID.has(id) ? id : null;
}

function normalizeInsight(raw: unknown): MultidisciplinaryExpertInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MultidisciplinaryExpertInsight> & {
    reactsToExpertId?: unknown;
  };
  const expertId = normalizeExpertId(o.expertId);
  if (!expertId) return null;
  const analysis = stripFacilitatorPhrasesFromExpertText(clip(o.analysis, 1800));
  if (!analysis) return null;
  const def = EXPERT_BY_ID.get(expertId)!;
  const roundRaw = Math.round(Number(o.round));
  const round = Number.isFinite(roundRaw)
    ? Math.min(2, Math.max(0, roundRaw))
    : 0;
  const reactsTo = normalizeExpertId(o.reactsToExpertId);
  return {
    expertId,
    expertLabelEn: clip(o.expertLabelEn, 40) || def.labelEn,
    expertLabelKo: clip(o.expertLabelKo, 40) || def.labelKo,
    lens: clip(o.lens, 80) || def.lens,
    analysis,
    round,
    ...(reactsTo && reactsTo !== expertId
      ? { reactsToExpertId: reactsTo }
      : {}),
  };
}

/** 전문가당 최대 3발화, 전체 대화 상한 */
const MAX_INSIGHTS_PER_SUBJECT = 24;
const MAX_TURNS_PER_EXPERT = 3;

function normalizeFollowUp(raw: unknown): MultidisciplinaryFollowUp | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MultidisciplinaryFollowUp>;
  const expertId = normalizeExpertId(o.expertId);
  if (!expertId) return null;
  const question = clip(o.question, 800);
  const reply = clip(o.reply, 2000);
  if (!question || !reply) return null;
  const def = EXPERT_BY_ID.get(expertId)!;
  return {
    id: clip(o.id, 60) || newId("fu"),
    expertId,
    expertLabelKo: clip(o.expertLabelKo, 40) || def.labelKo,
    expertLabelEn: clip(o.expertLabelEn, 40) || def.labelEn,
    question,
    reply,
    createdAt: clip(o.createdAt, 40) || new Date().toISOString(),
  };
}

const ROOT_LAYERS: RootReadingLayerId[] = [
  "surfaceSaid",
  "surfaceShown",
  "tension",
  "structuralBackground",
  "latentRoot",
  "whyUnspoken",
];

function normalizeSourceRefs(raw: unknown, allowedIds?: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 80))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, 12);
  if (!allowedIds || allowedIds.size === 0) return ids;
  const matched = ids.filter((id) => allowedIds.has(id));
  return matched.length ? matched : ids.slice(0, 3);
}

function ensureHypothesisMark(text: string, layer: RootReadingLayerId): string {
  const t = text.trim();
  if (!t) return "";
  if (
    layer === "surfaceSaid" ||
    layer === "surfaceShown" ||
    layer === "tension"
  ) {
    return t;
  }
  if (/\(가설/.test(t)) return t;
  return `${t} (가설)`;
}

export function normalizeRootReadingClaim(
  raw: unknown,
  layer: RootReadingLayerId,
  allowedNoteIds?: Set<string>,
): RootReadingClaim | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<RootReadingClaim> & {
    text?: unknown;
    sourceRefs?: unknown;
  };
  const text = ensureHypothesisMark(clip(o.text, 600), layer);
  if (!text) return null;
  const sourceRefs = normalizeSourceRefs(o.sourceRefs, allowedNoteIds);
  // 근원 레이어는 근거가 없으면 약화 — 텍스트는 유지하되 refs 비울 수 있음
  return {
    id: clip(o.id, 60) || newId(`rr-${layer}`),
    layer,
    text,
    sourceRefs,
    confidence: "hypothesis",
  };
}

export function normalizeRootReading(
  raw: unknown,
  allowedNoteIds?: Set<string>,
): MultidisciplinaryRootReading | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MultidisciplinaryRootReading>;
  const reading = emptyRootReading();
  let any = false;
  for (const layer of ROOT_LAYERS) {
    const claim = normalizeRootReadingClaim(o[layer], layer, allowedNoteIds);
    reading[layer] = claim;
    if (claim) any = true;
  }
  return any ? reading : null;
}

/** 후속 답변이 rootReading 일부만 갱신할 때 merge */
export function mergeRootReading(
  current: MultidisciplinaryRootReading | null | undefined,
  patch: Partial<MultidisciplinaryRootReading> | null | undefined,
  allowedNoteIds?: Set<string>,
): MultidisciplinaryRootReading | null {
  const base = current ?? emptyRootReading();
  if (!patch || typeof patch !== "object") {
    return ROOT_LAYERS.some((l) => base[l]) ? base : null;
  }
  const next = { ...base };
  for (const layer of ROOT_LAYERS) {
    if (!(layer in patch)) continue;
    const raw = patch[layer];
    if (raw === null) {
      next[layer] = null;
      continue;
    }
    const claim = normalizeRootReadingClaim(raw, layer, allowedNoteIds);
    if (claim) {
      // 기존 id 유지
      const prev = base[layer];
      next[layer] = prev ? { ...claim, id: prev.id } : claim;
    }
  }
  return ROOT_LAYERS.some((l) => next[l]) ? next : null;
}

function normalizeProbeKind(raw: unknown): ProbeQuestionKind | null {
  if (raw === "tension" || raw === "silence" || raw === "structure" || raw === "verify") {
    return raw;
  }
  return null;
}

export function normalizeProbeQuestion(
  raw: unknown,
): MultidisciplinaryProbeQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<MultidisciplinaryProbeQuestion>;
  const kind = normalizeProbeKind(o.kind);
  const text = clip(o.text, 240);
  if (!kind || !text) return null;
  const suggested = normalizeExpertId(o.suggestedExpertId);
  return {
    id: clip(o.id, 60) || newId("pq"),
    kind,
    text,
    ...(suggested ? { suggestedExpertId: suggested } : {}),
  };
}

function normalizePatternKind(raw: unknown): CrossSubjectPatternKind | null {
  if (
    raw === "shared_root" ||
    raw === "diverging_background" ||
    raw === "shared_unspoken"
  ) {
    return raw;
  }
  return null;
}

export function normalizeCrossSubjectPattern(
  raw: unknown,
): CrossSubjectPattern | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<CrossSubjectPattern>;
  const kind = normalizePatternKind(o.kind);
  const text = clip(o.text, 400);
  if (!kind || !text) return null;
  const subjectIds = Array.isArray(o.subjectIds)
    ? o.subjectIds
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim().slice(0, 80))
        .filter((id, i, arr) => arr.indexOf(id) === i)
        .slice(0, 12)
    : [];
  return {
    id: clip(o.id, 60) || newId("pat"),
    kind,
    text: ensureHypothesisMark(text, "latentRoot"),
    subjectIds,
    confidence: "hypothesis",
  };
}

function capInsightsPerExpert(
  insights: MultidisciplinaryExpertInsight[],
): MultidisciplinaryExpertInsight[] {
  const counts = new Map<MultidisciplinaryExpertId, number>();
  const out: MultidisciplinaryExpertInsight[] = [];
  for (const insight of insights) {
    const n = counts.get(insight.expertId) ?? 0;
    if (n >= MAX_TURNS_PER_EXPERT) continue;
    counts.set(insight.expertId, n + 1);
    out.push({ ...insight, round: Math.min(2, insight.round ?? n) });
    if (out.length >= MAX_INSIGHTS_PER_SUBJECT) break;
  }
  return out;
}

export function listRootReadingClaims(
  reading: MultidisciplinaryRootReading | null | undefined,
): RootReadingClaim[] {
  if (!reading) return [];
  return ROOT_LAYERS.map((l) => reading[l]).filter(
    (c): c is RootReadingClaim => Boolean(c),
  );
}

export function hasRootReadingContent(
  reading: MultidisciplinaryRootReading | null | undefined,
): boolean {
  return listRootReadingClaims(reading).length > 0;
}

/** noteId 집합을 넘겨 근거를 검증·보존 */
export function normalizeMultidisciplinaryAnalysis(
  raw: unknown,
  options?: { allowedNoteIdsBySubject?: Map<string, Set<string>> },
): MultidisciplinaryAnalysisData {
  const base = emptyMultidisciplinaryAnalysis();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<MultidisciplinaryAnalysisData>;

  const selectedExpertIds = Array.isArray(o.selectedExpertIds)
    ? o.selectedExpertIds
        .map(normalizeExpertId)
        .filter((id): id is MultidisciplinaryExpertId => id !== null)
        .filter((id, i, arr) => arr.indexOf(id) === i)
        .slice(0, 8)
    : [];

  const patterns = Array.isArray(o.patterns)
    ? o.patterns
        .map(normalizeCrossSubjectPattern)
        .filter((p): p is CrossSubjectPattern => p !== null)
        .slice(0, 12)
    : [];

  const bySubject = Array.isArray(o.bySubject)
    ? o.bySubject
        .map((s): MultidisciplinarySubjectAnalysis | null => {
          if (!s || typeof s !== "object") return null;
          const row = s as Partial<MultidisciplinarySubjectAnalysis>;
          const subjectId = clip(row.subjectId, 80);
          if (!subjectId) return null;
          const allowed =
            options?.allowedNoteIdsBySubject?.get(subjectId) ?? undefined;
          const insights = Array.isArray(row.insights)
            ? capInsightsPerExpert(
                row.insights
                  .map(normalizeInsight)
                  .filter(
                    (x): x is MultidisciplinaryExpertInsight => x !== null,
                  ),
              )
            : [];
          const followUps = Array.isArray(row.followUps)
            ? row.followUps
                .map(normalizeFollowUp)
                .filter((x): x is MultidisciplinaryFollowUp => x !== null)
                .slice(0, 40)
            : [];
          const probeQuestions = Array.isArray(row.probeQuestions)
            ? row.probeQuestions
                .map(normalizeProbeQuestion)
                .filter((x): x is MultidisciplinaryProbeQuestion => x !== null)
                .slice(0, 8)
            : [];
          const handedOffClaimIds = Array.isArray(row.handedOffClaimIds)
            ? row.handedOffClaimIds
                .filter((x): x is string => typeof x === "string")
                .map((x) => x.trim().slice(0, 60))
                .filter((id, i, arr) => id && arr.indexOf(id) === i)
                .slice(0, 40)
            : [];
          return {
            subjectId,
            subjectName: clip(row.subjectName, 120),
            insights,
            followUps,
            rootReading: normalizeRootReading(row.rootReading, allowed),
            probeQuestions,
            handedOffClaimIds,
          };
        })
        .filter((s): s is MultidisciplinarySubjectAnalysis => s !== null)
        .slice(0, 12)
    : [];

  return {
    generatedAt: clip(o.generatedAt, 40),
    selectedExpertIds,
    overview: clip(o.overview, 2000),
    patterns,
    bySubject,
  };
}

export function hasMultidisciplinaryAnalysisContent(
  data: MultidisciplinaryAnalysisData | null | undefined,
): boolean {
  if (!data) return false;
  if (data.overview.trim()) return true;
  if (data.patterns.some((p) => p.text.trim())) return true;
  return data.bySubject.some(
    (s) =>
      s.insights.some((i) => i.analysis.trim()) ||
      hasRootReadingContent(s.rootReading),
  );
}

/** 후속 질문용 — 해당 전문가의 가장 최근 발화 */
export function latestInsightForExpert(
  insights: MultidisciplinaryExpertInsight[],
  expertId: MultidisciplinaryExpertId,
): MultidisciplinaryExpertInsight | null {
  for (let i = insights.length - 1; i >= 0; i -= 1) {
    if (insights[i]?.expertId === expertId) return insights[i]!;
  }
  return null;
}

function heuristicRootReading(input: {
  subjectId: string;
  quotes: Array<{ id: string; text: string }>;
  observations: Array<{ id: string; text: string }>;
  findings: Array<{ id: string; text: string }>;
  problem: string;
}): MultidisciplinaryRootReading {
  const q = input.quotes[0];
  const o = input.observations[0];
  const f = input.findings[0];
  const problem = input.problem.trim() || "이 주제";

  return {
    surfaceSaid: q
      ? {
          id: newId("rr-surfaceSaid"),
          layer: "surfaceSaid",
          text: q.text.slice(0, 200),
          sourceRefs: [q.id],
          confidence: "hypothesis",
        }
      : null,
    surfaceShown: o
      ? {
          id: newId("rr-surfaceShown"),
          layer: "surfaceShown",
          text: o.text.slice(0, 200),
          sourceRefs: [o.id],
          confidence: "hypothesis",
        }
      : null,
    tension: {
      id: newId("rr-tension"),
      layer: "tension",
      text:
        q && o
          ? `말은 「${q.text.slice(0, 40)}」인데, 관찰에서는 「${o.text.slice(0, 40)}」 결이 보여요. 이 사이 공백을 더 파볼 여지가 있어요.`
          : `조사 기록에 말과 행동·발견이 한쪽으로 치우쳐 있어요. 「${problem}」과 연결해 빠진 쪽을 찾아볼 필요가 있어요.`,
      sourceRefs: [q?.id, o?.id, f?.id].filter((x): x is string => Boolean(x)),
      confidence: "hypothesis",
    },
    structuralBackground: {
      id: newId("rr-structuralBackground"),
      layer: "structuralBackground",
      text: `개인 성향만이 아니라, 「${problem}」을(를) 둘러싼 제도·관계·도구 조건이 같은 불편을 반복시킬 수 있어요. (가설)`,
      sourceRefs: [q?.id, o?.id].filter((x): x is string => Boolean(x)),
      confidence: "hypothesis",
    },
    latentRoot: {
      id: newId("rr-latentRoot"),
      layer: "latentRoot",
      text: `겉으로 말한 불편 뒤에는, 인정·통제·안전 같은 근원 욕구가 가려져 있을 수 있어요. (가설)`,
      sourceRefs: [q?.id, f?.id, o?.id].filter((x): x is string => Boolean(x)),
      confidence: "hypothesis",
    },
    whyUnspoken: {
      id: newId("rr-whyUnspoken"),
      layer: "whyUnspoken",
      text: `체면·역할 기대·‘원래 그런 일’로 습관화되어 직접 말하기 어려웠을 수 있어요. (가설)`,
      sourceRefs: [q?.id, o?.id].filter((x): x is string => Boolean(x)),
      confidence: "hypothesis",
    },
  };
}

function heuristicProbes(
  reading: MultidisciplinaryRootReading,
  experts: MultidisciplinaryExpertId[],
): MultidisciplinaryProbeQuestion[] {
  const tension = reading.tension?.text.slice(0, 40) ?? "말과 행동의 차이";
  const root = reading.latentRoot?.text.slice(0, 40) ?? "근원 욕구";
  const fallback = experts[0];
  if (!fallback) return [];
  const psych: MultidisciplinaryExpertId = experts.includes("psychologist")
    ? "psychologist"
    : fallback;
  const anth: MultidisciplinaryExpertId = experts.includes("anthropologist")
    ? "anthropologist"
    : (experts[1] ?? fallback);
  const consult: MultidisciplinaryExpertId = experts.includes("consultant")
    ? "consultant"
    : (experts[2] ?? fallback);
  const strategist: MultidisciplinaryExpertId = experts.includes("strategist")
    ? "strategist"
    : fallback;

  return [
    {
      id: newId("pq"),
      kind: "tension",
      text: `「${tension}」— 말은 A인데 행동은 B인 이유는 뭘까요?`,
      suggestedExpertId: psych,
    },
    {
      id: newId("pq"),
      kind: "silence",
      text: "왜 이걸 조사 중에 직접 말하기 어려웠을까요?",
      suggestedExpertId: anth,
    },
    {
      id: newId("pq"),
      kind: "structure",
      text: "개인이 아니라 어떤 조건이 이걸 반복시킬까요?",
      suggestedExpertId: consult,
    },
    {
      id: newId("pq"),
      kind: "verify",
      text: `「${root}」 가설을 다음 조사에서 무엇으로 확인할까요?`,
      suggestedExpertId: strategist,
    },
  ];
}

/** API 키 없을 때·파싱 실패 시 최소 휴리스틱 (오프닝 + 상호 반응 + rootReading) */
export function heuristicMultidisciplinaryAnalysis(input: {
  problem: string;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    quotes: Array<{ id: string; text: string }>;
    observations: Array<{ id: string; text: string }>;
    findings: Array<{ id: string; text: string }>;
  }>;
}): MultidisciplinaryAnalysisData {
  const pick: MultidisciplinaryExpertId[] = [
    "anthropologist",
    "psychologist",
    "product_designer",
    "hci_researcher",
    "strategist",
  ];
  const problem = input.problem.trim() || "이 프로젝트 주제";

  const bySubject = input.subjects.map((s, idx) => {
    const name = s.subjectName.trim() || `조사 대상 ${idx + 1}`;
    const quoteHint = s.quotes[0]?.text?.trim() || s.observations[0]?.text?.trim() || "";
    const findingHint = s.findings[0]?.text?.trim() || "";
    const cue =
      quoteHint || findingHint
        ? `「${(quoteHint || findingHint).slice(0, 60)}」`
        : `${name}의 조사 기록`;

    const openings: MultidisciplinaryExpertInsight[] = pick.map((id) => {
      const def = EXPERT_BY_ID.get(id)!;
      return {
        expertId: id,
        expertLabelEn: def.labelEn,
        expertLabelKo: def.labelKo,
        lens: def.lens,
        round: 0,
        analysis: `${cue}을(를) ${def.labelKo} 관점으로 보면, 「${problem}」과(와) 연결된 내면 욕구·장벽을 더 깊게 파볼 여지가 있어요. ${def.rootProbe} (가설)`,
      };
    });

    const reactions: MultidisciplinaryExpertInsight[] = [
      {
        ...openings[1]!,
        round: 1,
        reactsToExpertId: "anthropologist",
        analysis: `인류학자님이 짚은 문화·일상 결에 덧붙이면, 심리적으로는 불안을 줄이려는 확인 욕구가 겹쳐 보일 수 있어요. ${cue} 장면에서 그 긴장이 드러나요. 단순 동의가 아니라, 방어가 말을 가리는지 더 봐야 해요. (가설)`,
      },
      {
        ...openings[2]!,
        round: 1,
        reactsToExpertId: "psychologist",
        analysis: `심리학자님 말씀처럼 안정감이 핵심이라면, 제품 경험에서는 확인 단계를 더 짧고 눈에 보이게 만드는 쪽이 맞을 수 있어요. 다만 그건 표면 처방에 가깝고, 구조 조건을 같이 봐야 해요. (가설)`,
      },
      {
        ...openings[3]!,
        round: 2,
        reactsToExpertId: "product_designer",
        analysis: `디자이너님이 말한 짧은 확인 흐름을 HCI로 보면, 입력·전환 비용이 줄어들 때 앱을 다시 써 볼 동기가 생길 수 있어요. 사용자가 ‘내가 못해서’라고 말하는 지점이 시스템 마찰인지 가려야 해요. (가설)`,
      },
      {
        ...openings[4]!,
        round: 2,
        reactsToExpertId: "hci_researcher",
        analysis: `HCI 연구자님이 말한 전환 비용을 전략으로 묶으면, 「확인이 쉬운 쪽」을 차별점으로 삼아 우선순위를 잡을 여지가 있어요. 다음엔 이 가설을 무엇으로 검증할지 정해야 해요. (가설)`,
      },
    ];

    const rootReading = heuristicRootReading({
      subjectId: s.subjectId,
      quotes: s.quotes,
      observations: s.observations,
      findings: s.findings,
      problem,
    });

    return {
      subjectId: s.subjectId,
      subjectName: name,
      insights: capInsightsPerExpert([...openings, ...reactions]),
      followUps: [],
      rootReading,
      probeQuestions: heuristicProbes(rootReading, pick),
      handedOffClaimIds: [],
    };
  });

  const patterns: CrossSubjectPattern[] =
    bySubject.length >= 2
      ? [
          {
            id: newId("pat"),
            kind: "shared_root",
            text: `여러 대상에서 「인정·안전·통제」 같은 근원 욕구가 겹칠 수 있어요. (가설)`,
            subjectIds: bySubject.map((s) => s.subjectId),
            confidence: "hypothesis",
          },
          {
            id: newId("pat"),
            kind: "shared_unspoken",
            text: `공통으로 직접 말하기 어려워 보이는 지점은 체면·역할 기대와 닿아 있을 수 있어요. (가설)`,
            subjectIds: bySubject.map((s) => s.subjectId),
            confidence: "hypothesis",
          },
        ]
      : [];

  return {
    generatedAt: new Date().toISOString(),
    selectedExpertIds: pick,
    overview: `「${problem}」을(를) 중심으로, 문화·심리·경험·상호작용·전략 렌즈로 조사 결과의 표면·모순·근원을 다시 읽어 본 초안이에요. 전문가 해설은 가설이며, 다음 니즈 단계에서 검증이 필요해요.`,
    patterns,
    bySubject,
  };
}
