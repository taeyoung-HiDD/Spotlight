import {
  normalizeNemotronPersonaProfile,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";

/**
 * HuggingFace datasets-server로 nvidia/Nemotron-Personas-Korea(100만 행)에서
 * 타겟 세그먼트와 가장 가까운 가상 사용자를 검색·매칭한다.
 * 공개 데이터셋이라 토큰 없이 동작하며, HF_TOKEN이 있으면 레이트리밋이 완화된다.
 */

const DATASET_ID = "nvidia/Nemotron-Personas-Korea";
const DATASETS_SERVER = "https://datasets-server.huggingface.co";
const DATASET_TOTAL_ROWS = 1_000_000;
const FETCH_TIMEOUT_MS = 9_000;
const SEARCH_LENGTH = 24;

type NemotronRawRow = Record<string, unknown>;

function hfHeaders(): HeadersInit {
  const token =
    process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_API_TOKEN?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchDatasetJson(
  path: "filter" | "rows",
  params: Record<string, string>,
): Promise<{
  rows?: Array<{ row?: NemotronRawRow }>;
  num_rows_total?: number;
} | null> {
  const q = new URLSearchParams({
    dataset: DATASET_ID,
    config: "default",
    split: "train",
    ...params,
  });
  try {
    const res = await fetch(`${DATASETS_SERVER}/${path}?${q.toString()}`, {
      headers: hfHeaders(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      rows?: Array<{ row?: NemotronRawRow }>;
      num_rows_total?: number;
    };
  } catch {
    return null;
  }
}

function rowToProfile(row: NemotronRawRow): NemotronPersonaProfile | null {
  const profile = normalizeNemotronPersonaProfile({
    sourceId: row.uuid,
    persona: row.persona,
    professionalPersona: row.professional_persona,
    familyPersona: row.family_persona,
    culturalBackground: row.cultural_background,
    skillsAndExpertise: row.skills_and_expertise,
    hobbiesAndInterests: row.hobbies_and_interests,
    careerGoalsAndAmbitions: row.career_goals_and_ambitions,
    sex: row.sex,
    age: row.age,
    maritalStatus: row.marital_status,
    educationLevel: row.education_level,
    occupation: row.occupation,
    district: row.district,
    province: row.province,
    matchedAt: new Date().toISOString(),
  });
  return profile ?? null;
}

const KEYWORD_STOPWORDS = new Set([
  "그리고", "위한", "위해", "있는", "없는", "하는", "않는", "같은", "관련",
  "대한", "때문", "사람", "사용자", "유저", "고객", "타겟", "대상", "문제",
  "서비스", "제품", "니즈", "상황", "겪는", "겪고", "어려움", "불편",
]);

/** 세그먼트 설명에서 검색 키워드 추출 (2자 이상 한글·영문 토큰) */
export function extractPersonaSearchKeywords(
  name: string,
  context: string,
  max = 6,
): string[] {
  const text = `${name} ${context}`;
  const tokens = text
    .split(/[^가-힣a-zA-Z0-9]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !KEYWORD_STOPWORDS.has(t));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
    if (out.length >= max) break;
  }
  return out;
}

function profileSearchText(profile: NemotronPersonaProfile): string {
  return [
    profile.persona,
    profile.professionalPersona,
    profile.familyPersona,
    profile.culturalBackground,
    profile.skillsAndExpertise,
    profile.hobbiesAndInterests,
    profile.careerGoalsAndAmbitions,
    profile.occupation,
  ]
    .join(" ")
    .toLowerCase();
}

/** 키워드 겹침 기반 매칭 점수 */
function scoreProfile(
  profile: NemotronPersonaProfile,
  keywords: string[],
): number {
  const text = profileSearchText(profile);
  let score = 0;
  for (const keyword of keywords) {
    const k = keyword.toLowerCase();
    if (!text.includes(k)) continue;
    score += 2;
    if (profile.occupation.toLowerCase().includes(k)) score += 3;
  }
  return score;
}

/** LIKE 매칭에 사용할 텍스트 컬럼 (직업·페르소나·목표 순) */
const FILTER_COLUMNS = [
  "occupation",
  "persona",
  "professional_persona",
  "career_goals_and_ambitions",
] as const;

/** 키워드 1개 → 여러 컬럼 OR LIKE 조건 (키워드는 한글·영숫자만이라 이스케이프 불필요) */
function keywordCondition(keyword: string): string {
  return `(${FILTER_COLUMNS.map((c) => `"${c}" LIKE '%${keyword}%'`).join(" OR ")})`;
}

interface FilterResult {
  profiles: NemotronPersonaProfile[];
  totalRows: number;
}

async function filterCandidates(
  where: string,
  offset: number,
  length: number,
): Promise<FilterResult> {
  const json = await fetchDatasetJson("filter", {
    where,
    offset: String(offset),
    length: String(length),
  });
  if (!json?.rows) return { profiles: [], totalRows: 0 };
  return {
    profiles: json.rows
      .map((r) => (r.row ? rowToProfile(r.row) : null))
      .filter((p): p is NemotronPersonaProfile => p !== null),
    totalRows: typeof json.num_rows_total === "number" ? json.num_rows_total : 0,
  };
}

/**
 * 키워드 기반 후보 검색.
 * HF datasets-server의 전문 검색(search)은 한국어를 토크나이즈하지 못해
 * filter의 SQL LIKE를 사용한다. 같은 키워드로도 매번 다른 인물이 나오도록
 * 전체 매칭 수 안에서 임의 오프셋 페이지를 뽑는다.
 */
async function searchCandidates(keywords: string[]): Promise<NemotronPersonaProfile[]> {
  if (!keywords.length) return [];

  const clauses: string[] = [];
  if (keywords.length >= 2) {
    clauses.push(keywords.slice(0, 2).map(keywordCondition).join(" AND "));
  }
  clauses.push(keywords.map(keywordCondition).join(" OR "));

  for (const where of clauses) {
    const first = await filterCandidates(where, 0, SEARCH_LENGTH);
    if (!first.profiles.length) continue;
    if (first.totalRows <= SEARCH_LENGTH) return first.profiles;
    const offset = Math.floor(
      Math.random() * Math.max(1, first.totalRows - SEARCH_LENGTH),
    );
    const page = await filterCandidates(where, offset, SEARCH_LENGTH);
    return page.profiles.length ? page.profiles : first.profiles;
  }
  return [];
}

/** 검색 실패 시 임의 구간에서 후보 확보 (인구 통계 분포 자체가 대표성 있음) */
async function randomCandidates(): Promise<NemotronPersonaProfile[]> {
  const offset = Math.floor(Math.random() * (DATASET_TOTAL_ROWS - 100));
  const json = await fetchDatasetJson("rows", {
    offset: String(offset),
    length: "40",
  });
  if (!json?.rows?.length) return [];
  return json.rows
    .map((r) => (r.row ? rowToProfile(r.row) : null))
    .filter((p): p is NemotronPersonaProfile => p !== null);
}

export interface MatchNemotronPersonaInput {
  /** 타겟 세그먼트명 (예: 예비 창업가) */
  segmentName: string;
  /** 세그먼트 설명·이유 */
  segmentContext?: string;
  /** 문제 정의 (보조 키워드) */
  problem?: string;
  /** 같은 프로젝트에서 이미 매칭된 uuid — 중복 배정 방지 */
  excludeIds?: string[];
}

/**
 * 타겟 세그먼트에 가장 가까운 Nemotron 가상 사용자 1명 매칭.
 * 검색·매칭 실패 시 null (호출부는 기존 AI-only 생성으로 폴백).
 */
export async function matchNemotronPersona(
  input: MatchNemotronPersonaInput,
): Promise<NemotronPersonaProfile | null> {
  const keywords = extractPersonaSearchKeywords(
    input.segmentName,
    input.segmentContext ?? "",
  );
  const problemKeywords = extractPersonaSearchKeywords("", input.problem ?? "", 3);
  const exclude = new Set((input.excludeIds ?? []).filter(Boolean));

  let candidates = await searchCandidates(keywords);
  if (!candidates.length) {
    candidates = await randomCandidates();
  }

  const fresh = candidates.filter((c) => !exclude.has(c.sourceId));
  const pool = fresh.length ? fresh : candidates;
  if (!pool.length) return null;

  const scoreKeywords = [...keywords, ...problemKeywords];
  let best = pool[0]!;
  let bestScore = -1;
  for (const candidate of pool) {
    const score = scoreProfile(candidate, scoreKeywords);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}
