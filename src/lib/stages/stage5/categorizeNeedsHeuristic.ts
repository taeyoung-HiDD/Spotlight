/**
 * AI 없이 잠재 니즈 텍스트 유사도로 간단 클러스터링.
 * 그룹 이름은 어피니티 다이어그램(스탠퍼드 d.school·닐슨노먼 그룹 방식)처럼
 * 니즈 문장의 공통 주제를 나타내는 명사(구)여야 하며, "위해서·싶다·하고" 같은
 * Need Statement 문형 연결어는 이름 후보에서 제외한다.
 */

/** 미분류가 이 개수 이상이면 재분류 패스를 돌린다 */
export const UNCLASSIFIED_RECLUSTER_MIN = 10;

export type NeedClusterInput = {
  id: string;
  text: string;
};

export type NeedClusterResult = {
  name: string;
  needIds: string[];
};

/** Need Statement 문형·접속·부사·조사성 어미 — 그룹 이름 후보에서 제외 */
const STOPWORDS = new Set([
  "위해서", "위해", "위한", "통해서", "통해",
  "하고", "하기", "하며", "한다", "하는", "하려고", "하려는", "하는데",
  "싶다", "싶어", "싶은", "싶고",
  "때문에", "그리고", "그러나", "하지만", "그런데", "그래서", "그러면",
  "것", "것이", "것을", "것은", "것도", "것에", "그것", "이것", "저것", "정도",
  "수", "등", "좀", "너무", "정말", "매우", "아직", "이제", "다시",
  "많이", "적은", "적은", "큰", "작은", "이런", "그런", "저런",
  "계속", "대해", "대한", "같다", "같은", "없이", "없다", "있다",
  "되다", "된다", "되어", "되고",
  "이렇게", "그렇게", "저렇게", "이러다", "나중에", "지금", "여기", "거기",
  "이다", "입니다", "합니다", "해요", "이에요", "예요",
  "니까", "는데", "은데", "는지", "을지", "는가", "라서", "이라", "라는",
  "한테", "보다", "만큼", "처럼",
  "부모", "부모님", "친구", "친구들", "직장인",
  "recent", "years", "year", "month", "months", "etc",
]);

/** 이름 끝·조각으로 남으면 안 되는 조사·어미 */
const TRAILING_JOSA =
  /(으로|에서|에게|에는|에도|에는|으로|로|와|과|이|가|을|를|은|는|도|만|의|에|나|이나)$/;

/** 체언 뒤 조사·어미를 대략적으로 제거해 핵심 단어를 남긴다 */
const JOSA_SUFFIXES = [
  "으로써", "으로서", "이라고는", "이라고", "라고",
  "에서부터", "부터", "까지", "마다", "조차", "밖에", "만큼", "처럼",
  "으로", "로", "에게", "에서", "에는", "에도", "에",
  "과는", "와는", "이나", "과", "와", "나",
  "이라", "라",
  "이는", "는",
  "이가", "가",
  "이을", "을",
  "를", "이", "은", "도", "만", "의",
];

/** 접미사 목록에서 일치하는 것을 찾아 한 번 제거한다 */
function stripOnce(token: string, suffixes: string[]): string {
  for (const suffix of suffixes) {
    if (token.length > suffix.length + 1 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

/** 조사가 겹쳐 붙은 경우("남들만큼은" 등)를 위해 안정될 때까지 반복 제거 */
function stripJosa(token: string): string {
  let current = token;
  for (let i = 0; i < 3; i += 1) {
    const stripped = stripOnce(current, JOSA_SUFFIXES);
    if (stripped === current) break;
    current = stripped;
  }
  return current;
}

/** 명사 어간에 붙은 동사화 어미(...하기/...하고 등)를 제거해 명사 후보를 남긴다 */
const VERB_SUFFIXES = [
  "하려고", "하려는", "하지만", "하지",
  "하고", "하기", "하는", "하며", "해서", "하여",
  "했다", "한다", "되었다", "됐다", "되고", "되는", "된다", "되어",
];

function stripVerbSuffix(token: string): string {
  return stripOnce(token, VERB_SUFFIXES);
}

function isLatinToken(token: string): boolean {
  return /^[a-z0-9]+$/i.test(token);
}

/** 단독으로는 주제 라벨이 되기 어려운 약한 토큰 */
const WEAK_NAME_TOKENS = new Set([
  "미국", "한국", "일본", "중국", "유럽", "아시아",
  "올해", "작년", "최근", "정도", "현실", "마음", "자신", "사람",
  "상황", "문제", "부분", "관련", "경우", "때문", "이상", "이하",
]);

/** 잘린 활용형·숫자 자리표시·조사 잔여 등 — 이름 토큰으로 쓰면 안 됨 */
function isFragmentToken(token: string): boolean {
  if (token.length < 2) return true;
  if (/^\d+$/.test(token) || /^0+$/.test(token)) return true;
  if (/[0-9]/.test(token) && token.length <= 4) return true;
  if (isLatinToken(token) && token.length <= 8) return true;
  if (WEAK_NAME_TOKENS.has(token)) return true;
  const stem = stripJosa(stripVerbSuffix(token));
  if (stem.length < 2 || STOPWORDS.has(stem) || STOPWORDS.has(token)) return true;
  // 조사만 남은 조각 ("것에", "돈이") — stem이 원형보다 짧고 매우 짧음
  if (TRAILING_JOSA.test(token) && stem.length <= 2 && stem !== token) {
    return true;
  }
  // 명확한 활용·연결 파편만 (자/한/고 등 짧은 음절은 명사에도 흔해 제외)
  if (
    /(면서|면서의|하고자|하고자하|파악하고자|이해할|돌아서면|깨달았|요구받|한마디|반발심만)$/.test(
      token,
    )
  ) {
    return true;
  }
  if (
    token.length <= 4 &&
    /(았다|었다|했다|됐다|된다|한다|하는|하며|하고|하기|하려|받음|받으)$/.test(
      token,
    )
  ) {
    return true;
  }
  return false;
}

/** 문장 내용을 주제 라벨로 매핑 (토큰 조각보다 우선) */
const THEME_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /투자|주식|etf|코인|펀드|자산\s*배분|금융\s*상품/i, name: "투자 판단" },
  {
    re: /카드\s*값|신용카드|월\s*카드|지출|소비|과소비|돈을?\s*.{0,12}많|너무\s*많이\s*쓰|쓰는\s*것|한숨.{0,8}부담|부담.{0,8}느끼/,
    name: "지출 부담",
  },
  { re: /저축|모아|모은\s*돈|비상금|적금/, name: "저축·비상금" },
  { re: /허탈|부족감|부족하|모자란|모은\s*돈이\s*부족/, name: "부족·허탈감" },
  { re: /이직|연봉|커리어|직장|승진|급여|월급|career\s*change|salary/i, name: "커리어·소득" },
  { re: /학원|교육비|자녀\s*교육|육아|academy/i, name: "교육비 부담" },
  { re: /가전|생활비|공과금/, name: "생활비 부담" },
  { re: /주거|전세|월세|대출|이자|집값/, name: "주거·대출" },
  { re: /독립|자립|부모(?!님)|의존/, name: "경제적 독립" },
  { re: /비교|뒤처|인정|체면|눈치/, name: "사회적 비교·인정" },
  { re: /불안|걱정|초조|두려움|스트레스/, name: "재정 불안" },
  { re: /목표|계획|기준|루틴|관리/, name: "재정 기준·계획" },
  { re: /정보|검색|과부하|믿|신뢰/, name: "정보 신뢰" },
  { re: /시간|바쁨|여유|압박/, name: "시간 압박" },
  { re: /건강|수면|밤낮|피곤/, name: "건강·에너지" },
  { re: /관계|배우자|아내|남편|가족/, name: "가족·관계" },
];

const CURATED_THEME_NAMES = new Set(THEME_PATTERNS.map((p) => p.name));

function themeNameFromTexts(texts: string[]): string | null {
  const score = new Map<string, number>();
  for (const text of texts) {
    for (const p of THEME_PATTERNS) {
      // 정규식 대안(|)마다 매칭 수를 세어 더 구체적인 테마를 선호
      const parts = p.re.source.split("|");
      let strength = 0;
      for (const part of parts) {
        try {
          if (part && new RegExp(part, p.re.flags).test(text)) strength += 1;
        } catch {
          // 잘못된 분할은 무시
        }
      }
      if (strength === 0 && p.re.test(text)) strength = 1;
      if (strength > 0) {
        score.set(p.name, (score.get(p.name) ?? 0) + strength);
      }
    }
  }
  if (score.size === 0) return null;
  const order = new Map(THEME_PATTERNS.map((p, i) => [p.name, i]));
  const best = [...score.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99);
  })[0];
  return best?.[0] ?? null;
}

/** "...(보상 심리)" 같은 괄호 속 주제 힌트를 추출한다 */
function extractAnnotation(text: string): string | null {
  const match = text.match(/[(（]([^()（）]{2,20})[)）]/);
  if (!match) return null;
  const inner = match[1]!.trim();
  if (!/[\uac00-\ud7a3]/.test(inner)) return null;
  if (isLowQualityGroupName(inner)) return null;
  return inner;
}

function contentTokens(text: string): string[] {
  const hasHangul = /[\uac00-\ud7a3]/.test(text);
  const withoutAnnotation = text.replace(/[(（][^()（）]*[)）]/g, " ");
  return withoutAnnotation
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => stripJosa(stripVerbSuffix(t.trim())))
    .filter((t) => {
      if (t.length < 2) return false;
      if (STOPWORDS.has(t)) return false;
      if (isFragmentToken(t)) return false;
      if (/[다요]$/.test(t)) return false;
      // 한글 문장에 섞인 영어 단어는 이름 후보에서 제외
      if (hasHangul && isLatinToken(t)) return false;
      if (!/[\uac00-\ud7a3]/.test(t)) return false;
      return true;
    });
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** 이름이 문형 연결어·조사·잘린 어미만으로 이루어진 저품질 이름인지 검사 */
export function isLowQualityGroupName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return true;
  if (trimmed === "미분류") return false;
  // 큐레이트 테마 라벨은 항상 허용
  if (CURATED_THEME_NAMES.has(trimmed)) return false;
  if (/[0-9]{2,}/.test(trimmed) || /000/.test(trimmed)) return true;
  // 영어만·영어 위주 라벨
  const hangulChars = (trimmed.match(/[\uac00-\ud7a3]/g) ?? []).length;
  const latinChars = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  if (hangulChars === 0) return true;
  if (latinChars >= hangulChars) return true;
  // 조사·어미로 끝나는 문장 조각 (공백 제거 후)
  const compact = trimmed.replace(/\s+/g, "");
  if (TRAILING_JOSA.test(compact)) return true;
  // 문장 조각처럼 보이는 연결형
  if (
    /(면서|하고자|이해할|돌아서|깨달았|요구받|한마디|반발심만|것에|돈이)$/.test(
      trimmed,
    ) ||
    /^(파악하고자|주체로서|돌아서면|현실적인|요약하면|많이|recent)/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  const tokens = trimmed
    .split(/[\s·]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => stripJosa(t));
  if (tokens.length === 0) return true;
  if (
    tokens.every(
      (t) =>
        STOPWORDS.has(t) ||
        t.length < 2 ||
        isFragmentToken(t) ||
        WEAK_NAME_TOKENS.has(t),
    )
  ) {
    return true;
  }
  // 토큰 중 과반이 파편·약하면 저품질
  const fragments = tokens.filter(
    (t) =>
      STOPWORDS.has(t) ||
      isFragmentToken(t) ||
      isLatinToken(t) ||
      WEAK_NAME_TOKENS.has(t),
  );
  if (fragments.length >= Math.ceil(tokens.length / 2)) return true;
  return false;
}

/** 그룹에 속한 니즈 텍스트로부터 어피니티 다이어그램 스타일 이름을 도출 */
export function deriveGroupNameFromTexts(texts: string[]): string {
  return nameFromTexts(texts);
}

function nameFromTexts(texts: string[]): string {
  const filtered = texts.map((t) => t.trim()).filter(Boolean);
  if (filtered.length === 0) return "관련 니즈";

  // 1) 괄호 주석 주제
  const annotations = filtered
    .map(extractAnnotation)
    .filter((a): a is string => Boolean(a));
  if (annotations.length > 0) {
    const freq = new Map<string, number>();
    for (const a of annotations) freq.set(a, (freq.get(a) ?? 0) + 1);
    const best = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && !isLowQualityGroupName(best[0])) return best[0];
  }

  // 2) 도메인 테마 패턴 (조각 토큰보다 우선) — 큐레이트 라벨은 그대로 사용
  const theme = themeNameFromTexts(filtered);
  if (theme) return theme;

  // 3) 한글 명사 토큰 상위 1~2개 (품질 검사 통과 시에만)
  const freq = new Map<string, number>();
  for (const text of filtered) {
    for (const token of new Set(contentTokens(text))) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  const top = [...freq.entries()]
    .filter(
      ([w]) =>
        !isFragmentToken(w) && !STOPWORDS.has(w) && !WEAK_NAME_TOKENS.has(w),
    )
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 2)
    .map(([w]) => w);

  if (top.length === 1 && !isLowQualityGroupName(top[0]!)) {
    return top[0]!;
  }
  if (top.length >= 2) {
    const joined = `${top[0]} ${top[1]}`;
    if (!isLowQualityGroupName(joined)) return joined;
    if (!isLowQualityGroupName(top[0]!)) return top[0]!;
  }

  return "관련 니즈";
}

export function needTokenSet(text: string): Set<string> {
  return new Set(contentTokens(text));
}

export function textSimilarity(a: string, b: string): number {
  return jaccard(needTokenSet(a), needTokenSet(b));
}

/**
 * 1개짜리 파편 클러스터를 가장 가까운 묶음에 흡수한다.
 * 유사도가 너무 낮으면 서로 가까운 싱글톤끼리만 묶는다.
 */
export function collapseSingletonClusters(
  clusters: NeedClusterResult[],
  needsById: Map<string, string>,
  minSimilarity = 0.12,
): NeedClusterResult[] {
  if (clusters.length <= 1) return clusters;

  let working = clusters.map((c) => ({
    name: c.name,
    needIds: [...c.needIds],
  }));

  const scoreAgainst = (needId: string, cluster: NeedClusterResult): number => {
    const text = needsById.get(needId) ?? "";
    if (!text) return 0;
    const members = cluster.needIds
      .map((id) => needsById.get(id) ?? "")
      .filter(Boolean);
    if (members.length === 0) return 0;
    let best = 0;
    for (const m of members) {
      best = Math.max(best, textSimilarity(text, m));
    }
    return best;
  };

  // 싱글톤 → 가장 큰(또는 유사한) 클러스터로 흡수
  let changed = true;
  while (changed) {
    changed = false;
    const singles = working.filter((c) => c.needIds.length === 1);
    const multi = working.filter((c) => c.needIds.length > 1);
    if (singles.length === 0 || multi.length === 0) break;

    const next: NeedClusterResult[] = [...multi];
    for (const single of singles) {
      const needId = single.needIds[0]!;
      let bestIdx = -1;
      let bestScore = 0;
      for (let i = 0; i < next.length; i += 1) {
        const score = scoreAgainst(needId, next[i]!);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0 && bestScore >= minSimilarity) {
        next[bestIdx]!.needIds.push(needId);
        changed = true;
      } else {
        next.push(single);
      }
    }
    working = next;
  }

  // 남은 싱글톤끼리 유사도로 묶기
  const singles = working.filter((c) => c.needIds.length === 1);
  const kept = working.filter((c) => c.needIds.length > 1);
  if (singles.length <= 1) {
    return [...kept, ...singles].map((c) => ({
      ...c,
      name:
        c.name === "미분류"
          ? c.name
          : nameFromTexts(c.needIds.map((id) => needsById.get(id) ?? "")),
    }));
  }

  const parent = singles.map((_, i) => i);
  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]!);
    return parent[i]!;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let i = 0; i < singles.length; i += 1) {
    for (let j = i + 1; j < singles.length; j += 1) {
      const a = needsById.get(singles[i]!.needIds[0]!) ?? "";
      const b = needsById.get(singles[j]!.needIds[0]!) ?? "";
      if (textSimilarity(a, b) >= minSimilarity) union(i, j);
    }
  }

  const buckets = new Map<number, string[]>();
  for (let i = 0; i < singles.length; i += 1) {
    const root = find(i);
    const list = buckets.get(root) ?? [];
    list.push(singles[i]!.needIds[0]!);
    buckets.set(root, list);
  }

  const mergedSingles = [...buckets.values()].map((needIds) => ({
    name: nameFromTexts(needIds.map((id) => needsById.get(id) ?? "")),
    needIds,
  }));

  return [...kept, ...mergedSingles].map((c) => ({
    ...c,
    name:
      c.name === "미분류"
        ? c.name
        : nameFromTexts(c.needIds.map((id) => needsById.get(id) ?? "")) ||
          c.name,
  }));
}

/** 유사도 임계값 이상이면 같은 클러스터로 병합 */
export function heuristicClusterNeeds(
  needs: NeedClusterInput[],
  threshold = 0.22,
): NeedClusterResult[] {
  if (needs.length === 0) return [];

  const tokens = needs.map((n) => new Set(contentTokens(n.text)));
  const parent = needs.map((_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]!);
    return parent[i]!;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  }

  for (let i = 0; i < needs.length; i += 1) {
    for (let j = i + 1; j < needs.length; j += 1) {
      if (jaccard(tokens[i]!, tokens[j]!) >= threshold) {
        union(i, j);
      }
    }
  }

  const buckets = new Map<number, NeedClusterInput[]>();
  for (let i = 0; i < needs.length; i += 1) {
    const root = find(i);
    const list = buckets.get(root) ?? [];
    list.push(needs[i]!);
    buckets.set(root, list);
  }

  const raw = [...buckets.values()].map((items, index) => ({
    name: nameFromTexts(items.map((i) => i.text)) || `그룹 ${index + 1}`,
    needIds: items.map((i) => i.id),
  }));

  const byId = new Map(needs.map((n) => [n.id, n.text] as const));
  return collapseSingletonClusters(raw, byId);
}
