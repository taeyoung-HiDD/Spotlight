const STORAGE_KEY = "spotlight:stage-guide-dismissed";

/** 단계 활동 가이드(게이트·다이얼로그)를 쓰지 않는 단계 */
const STAGES_WITHOUT_ACTIVITY_GUIDE = new Set([1]);

export function isStageActivityGuideEnabled(stageNumber: number): boolean {
  return !STAGES_WITHOUT_ACTIVITY_GUIDE.has(stageNumber);
}

function readMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

export function isStageGuideDismissed(stageNumber: number): boolean {
  const map = readMap();
  return map[String(stageNumber)] === true;
}

export function setStageGuideDismissed(
  stageNumber: number,
  dismissed: boolean,
): void {
  const map = readMap();
  if (dismissed) {
    map[String(stageNumber)] = true;
  } else {
    delete map[String(stageNumber)];
  }
  writeMap(map);
}
