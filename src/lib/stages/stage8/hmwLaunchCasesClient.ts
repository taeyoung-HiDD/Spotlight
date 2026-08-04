import type {
  HmwLaunchCase,
  HmwLaunchCasesResult,
} from "@/lib/stages/stage8/hmwLaunchCases";

/** 세션 동안 HMW id별 사례 캐시 */
const casesCache = new Map<string, HmwLaunchCase[]>();
const inflight = new Map<string, Promise<HmwLaunchCase[]>>();

function cacheKey(projectId: string, hmwId: string): string {
  return `${projectId}::${hmwId}`;
}

export function getCachedHmwLaunchCases(
  projectId: string,
  hmwId: string,
): HmwLaunchCase[] | undefined {
  return casesCache.get(cacheKey(projectId, hmwId));
}

export async function requestHmwLaunchCases(params: {
  projectId: string;
  hmwId: string;
  hmwText: string;
  latentNeedText?: string;
}): Promise<HmwLaunchCase[]> {
  const { projectId, hmwId, hmwText, latentNeedText = "" } = params;
  const key = cacheKey(projectId, hmwId);
  const cached = casesCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const res = await fetch("/api/stage8/hmw-launch-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        hmwText,
        latentNeedText,
      }),
    });
    const json = (await res.json()) as HmwLaunchCasesResult & {
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? "출시 사례를 불러오지 못했습니다.");
    }
    const cases = Array.isArray(json.cases) ? json.cases : [];
    casesCache.set(key, cases);
    return cases;
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}
