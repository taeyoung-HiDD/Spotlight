const MAX_STACK = 40;

function storageKey(projectId: string): string {
  return `spotlight-workspace-nav:${projectId}`;
}

function readStack(projectId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

function writeStack(projectId: string, stack: string[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(projectId), JSON.stringify(stack));
  } catch {
    /* quota */
  }
}

/** 프로젝트 워크스페이스 방문 경로 누적 (동일 경로 연속 중복 제외) */
export function pushWorkspaceVisit(projectId: string, path: string): void {
  const normalized = path.trim();
  if (!normalized) return;
  const stack = readStack(projectId);
  if (stack[stack.length - 1] === normalized) return;
  stack.push(normalized);
  writeStack(projectId, stack.slice(-MAX_STACK));
}

/** 현재 화면 직전 방문 경로 (스택 변경 없음) */
export function peekPreviousWorkspaceVisit(
  projectId: string,
  currentPath: string,
): string | null {
  const stack = readStack(projectId);
  let idx = stack.length - 1;
  if (idx >= 0 && stack[idx] === currentPath) idx -= 1;
  return idx >= 0 ? stack[idx] : null;
}

/** 현재 화면을 스택에서 빼고 직전 방문 경로 반환 */
export function popPreviousWorkspaceVisit(
  projectId: string,
  currentPath: string,
): string | null {
  const stack = readStack(projectId);
  if (stack.length && stack[stack.length - 1] === currentPath) {
    stack.pop();
  }
  const prev = stack[stack.length - 1] ?? null;
  writeStack(projectId, stack);
  return prev;
}
