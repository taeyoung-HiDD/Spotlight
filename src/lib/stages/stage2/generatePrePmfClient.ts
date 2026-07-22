import {
  normalizePrePmfOverview,
  type PrePmfOverviewData,
} from "@/lib/stages/stage2/prePmfOverview";

export type PrePmfStart =
  | { kind: "overview"; overview: PrePmfOverviewData }
  | { kind: "research"; interactionId: string };

export type PrePmfPoll =
  | { status: "in_progress" }
  | { status: "completed"; overview: PrePmfOverviewData }
  | { status: "failed"; error: string };

type StartOptions = {
  /** Deep Research 건너뛰고 grounded 동기 생성만 사용 (배포 폴백) */
  forceSync?: boolean;
};

/**
 * 사전 조사 시작.
 * - Deep Research 에이전트 사용 시: interactionId만 받고 이후 pollPrePmfResearch로 폴링.
 * - 비활성·폴백 시: 동기 grounded 생성 결과(overview)를 즉시 반환.
 */
export async function startPrePmfOverview(
  problem: string,
  options?: StartOptions,
): Promise<PrePmfStart> {
  const res = await fetch("/api/stage2/pre-pmf-overview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ problem, forceSync: options?.forceSync ?? false }),
  });

  const data = (await res.json()) as {
    mode?: string;
    interactionId?: string;
    overview?: unknown;
    source?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "사전 조사 생성에 실패했습니다.");
  }

  if (data.mode === "deep_research" && data.interactionId) {
    return { kind: "research", interactionId: data.interactionId };
  }

  if (data.source === "heuristic") {
    throw new Error(
      data.error ??
        "GEMINI_API_KEY가 서버에 설정되지 않았습니다. 배포 환경(Vercel) Environment Variables에 키를 추가한 뒤 재배포해 주세요.",
    );
  }

  if (data.source && data.source !== "gemini") {
    throw new Error(
      data.error ?? "사전 조사를 생성하지 못했습니다. 다시 시도해 주세요.",
    );
  }

  return { kind: "overview", overview: normalizePrePmfOverview(data.overview) };
}

/** Deep Research 진행 상태 1회 폴링 */
export async function pollPrePmfResearch(
  interactionId: string,
  problem: string,
): Promise<PrePmfPoll> {
  const res = await fetch("/api/stage2/pre-pmf-research-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interactionId, problem }),
  });

  const data = (await res.json()) as {
    status?: string;
    overview?: unknown;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "사전 조사 진행 상태 조회에 실패했습니다.");
  }

  if (data.status === "completed") {
    return { status: "completed", overview: normalizePrePmfOverview(data.overview) };
  }
  if (data.status === "failed") {
    return { status: "failed", error: data.error ?? "사전 조사에 실패했습니다." };
  }
  return { status: "in_progress" };
}

const POLL_INTERVAL_MS = 12_000;
const MAX_POLL_ATTEMPTS = 80; // 약 16분

export interface RunPrePmfOptions {
  /** 폴링 중단 신호 (언마운트 등) */
  isCancelled?: () => boolean;
  /** Deep Research interactionId 확보 시 (재개용 저장) */
  onResearchStarted?: (interactionId: string) => void;
  /** 처음부터 grounded 동기 생성만 사용 */
  forceSync?: boolean;
}

/** 시작→완료까지 전체 오케스트레이션 (Deep Research면 내부에서 폴링) */
export async function generatePrePmfOverview(
  problem: string,
  options?: RunPrePmfOptions,
): Promise<PrePmfOverviewData> {
  try {
    return await runPrePmfOverviewOnce(problem, options);
  } catch (firstError) {
    if (options?.forceSync) throw firstError;
    // 배포 환경: Deep Research·타임아웃 실패 시 grounded 동기 생성으로 1회 재시도
    try {
      return await runPrePmfOverviewOnce(problem, {
        ...options,
        forceSync: true,
      });
    } catch {
      throw firstError;
    }
  }
}

/** 저장된 interactionId로 폴링 재개 (새로고침 복구용) */
export async function resumePrePmfResearch(
  interactionId: string,
  problem: string,
  options?: RunPrePmfOptions,
): Promise<PrePmfOverviewData> {
  try {
    return await pollUntilDone(interactionId, problem, options);
  } catch (firstError) {
    if (options?.forceSync) throw firstError;
    try {
      const started = await startPrePmfOverview(problem, { forceSync: true });
      if (started.kind === "overview") return started.overview;
      throw firstError;
    } catch {
      throw firstError;
    }
  }
}

async function runPrePmfOverviewOnce(
  problem: string,
  options?: RunPrePmfOptions,
): Promise<PrePmfOverviewData> {
  const started = await startPrePmfOverview(problem, {
    forceSync: options?.forceSync,
  });
  if (started.kind === "overview") return started.overview;

  options?.onResearchStarted?.(started.interactionId);
  return pollUntilDone(started.interactionId, problem, options);
}

async function pollUntilDone(
  interactionId: string,
  problem: string,
  options?: RunPrePmfOptions,
): Promise<PrePmfOverviewData> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (options?.isCancelled?.()) {
      throw new Error("cancelled");
    }
    await delay(POLL_INTERVAL_MS);
    if (options?.isCancelled?.()) {
      throw new Error("cancelled");
    }
    const poll = await pollPrePmfResearch(interactionId, problem);
    if (poll.status === "completed") return poll.overview;
    if (poll.status === "failed") throw new Error(poll.error);
  }
  throw new Error("사전 조사가 시간 내에 완료되지 않았습니다.");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
