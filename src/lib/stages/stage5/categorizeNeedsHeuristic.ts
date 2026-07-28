/**
 * AI 없이 잠재 니즈 텍스트 유사도로 간단 클러스터링.
 * 그룹 이름은 어피니티 다이어그램(스탠퍼드 d.school·닐슨노먼 그룹 방식)처럼
 * 니즈 문장의 공통 주제를 나타내는 명사(구)여야 하며, "위해서·싶다·하고" 같은
 * Need Statement 문형 연결어는 이름 후보에서 제외한다.
 */
export type NeedClusterInput = {
  id: string;
  text: string;
};

export type NeedClusterResult = {
  name: string;
  needIds: string[];
};

/** Need Statement 문형·접속·조사성 어미 — 그룹 이름 후보에서 제외 */
const STOPWORDS = new Set([
  "위해서", "위해", "위한", "통해서", "통해",
  "하고", "하기", "하며", "한다", "하는", "하려고", "하려는", "하는데",
  "싶다", "싶어", "싶은", "싶고",
  "때문에", "그리고", "그러나", "하지만", "그런데", "그래서", "그러면",
  "것", "것이", "것을", "것은", "것도", "그것", "이것", "저것", "정도",
  "수", "등", "좀", "너무", "정말", "매우", "아직", "이제", "다시",
  "계속", "대해", "대한", "같다", "같은", "없이", "없다", "있다",
  "되다", "된다", "되어", "되고",
  "이렇게", "그렇게", "저렇게", "이러다", "나중에", "지금", "여기", "거기",
  "이다", "입니다", "합니다", "해요", "이에요", "예요",
  "니까", "는데", "은데", "는지", "을지", "는가", "라서", "이라", "라는",
  "한테", "보다", "만큼", "처럼",
  "부모", "부모님", "친구", "친구들", "직장인",
]);

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

/** 잘린 활용형·숫자 자리표시 등 — 이름 토큰으로 쓰면 안 됨 */
function isFragmentToken(token: string): boolean {
  if (token.length < 2) return true;
  if (/^\d+$/.test(token) || /^0+$/.test(token)) return true;
  if (/[0-9]/.test(token) && token.length <= 4) return true;
  // 문장 중간이 잘린 활용·연결 어미
  if (
    /(받|았|었|면서|면서의|대|할|한|된|될|는|은|을|를|고|며|자|면|니|려|겠|싶)$/.test(
      token,
    ) &&
    token.length <= 5
  ) {
    return true;
  }
  if (/(하고자|하고자하|파악하고자|이해할|돌아서면|깨달았|요구받)$/.test(token)) {
    return true;
  }
  return false;
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
  const withoutAnnotation = text.replace(/[(（][^()（）]*[)）]/g, " ");
  return withoutAnnotation
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => stripJosa(stripVerbSuffix(t.trim())))
    .filter(
      (t) =>
        t.length >= 2 &&
        !STOPWORDS.has(t) &&
        !isFragmentToken(t) &&
        !/[다요]$/.test(t),
    );
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
  if (/[0-9]{2,}/.test(trimmed) || /000/.test(trimmed)) return true;
  // 문장 조각처럼 보이는 연결형
  if (
    /(면서|하고자|이해할|돌아서|깨달았|요구받|한마디|반발심만)$/.test(trimmed) ||
    /^(파악하고자|주체로서|돌아서면|현실적인|요약하면)/.test(trimmed)
  ) {
    return true;
  }
  const tokens = trimmed
    .split(/[\s·]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  if (tokens.every((t) => STOPWORDS.has(t) || t.length < 2 || isFragmentToken(t))) {
    return true;
  }
  // 토큰 중 과반이 파편이면 저품질
  const fragments = tokens.filter((t) => STOPWORDS.has(t) || isFragmentToken(t));
  if (fragments.length >= Math.ceil(tokens.length / 2)) return true;
  return false;
}

/** 그룹에 속한 니즈 텍스트로부터 어피니티 다이어그램 스타일 이름을 도출 */
export function deriveGroupNameFromTexts(texts: string[]): string {
  return nameFromTexts(texts);
}

function nameFromTexts(texts: string[]): string {
  const annotations = texts
    .map(extractAnnotation)
    .filter((a): a is string => Boolean(a));
  if (annotations.length > 0) {
    const freq = new Map<string, number>();
    for (const a of annotations) freq.set(a, (freq.get(a) ?? 0) + 1);
    const best = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best && !isLowQualityGroupName(best[0])) return best[0];
  }

  const freq = new Map<string, number>();
  for (const text of texts) {
    for (const token of new Set(contentTokens(text))) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  const top = [...freq.entries()]
    .filter(([w]) => !isFragmentToken(w) && !STOPWORDS.has(w))
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 2)
    .map(([w]) => w);
  if (top.length === 0) return "관련 니즈";
  const joined = top.join(" ");
  if (isLowQualityGroupName(joined)) return top[0] && !isLowQualityGroupName(top[0]) ? top[0] : "관련 니즈";
  return joined;
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
  if (singles.length <= 1) return [...kept, ...singles];

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

  return [...kept, ...mergedSingles];
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
