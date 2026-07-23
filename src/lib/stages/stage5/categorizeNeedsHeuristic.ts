/**
 * AI 없이 잠재 니즈 텍스트 유사도로 간단 클러스터링.
 */
export type NeedClusterInput = {
  id: string;
  text: string;
};

export type NeedClusterResult = {
  name: string;
  needIds: string[];
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2),
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

function nameFromTexts(texts: string[]): string {
  const freq = new Map<string, number>();
  for (const text of texts) {
    for (const token of tokenize(text)) {
      if (token.length < 2) continue;
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 2)
    .map(([w]) => w);
  if (top.length === 0) return "미분류";
  return top.join(" · ");
}

/** 유사도 임계값 이상이면 같은 클러스터로 병합 */
export function heuristicClusterNeeds(
  needs: NeedClusterInput[],
  threshold = 0.18,
): NeedClusterResult[] {
  if (needs.length === 0) return [];

  const tokens = needs.map((n) => tokenize(n.text));
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

  return [...buckets.values()].map((items, index) => ({
    name: nameFromTexts(items.map((i) => i.text)) || `그룹 ${index + 1}`,
    needIds: items.map((i) => i.id),
  }));
}
