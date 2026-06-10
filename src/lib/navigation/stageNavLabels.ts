import { getSidebarStage } from "@/lib/stages/sidebarNav";
import { STAGE_META } from "@/lib/stages/constants";

/** GNB 홈(컷 21 프로젝트 허브) */
export const WORKSPACE_HOME_PAGE_NAME = "프로젝트 허브";

/** 단계 4 · 하위 화면 (동일 URL 내 phase) */
export const STAGE4_EMPATHY_MAP_PAGE = "공감맵 그리기";
export const STAGE4_DATA_SYNTHESIS_PAGE = "데이터 정리";

/** 단계 내 하위 화면 — 사이드바와 동일한 활동명 우선 */
export function getStagePageName(stageId: number): string {
  const nav = getSidebarStage(stageId)?.navLabel;
  if (nav) return nav;
  const meta = STAGE_META[stageId];
  if (meta?.title) return meta.title;
  return `단계 ${stageId}`;
}

export function stageProjectPath(projectId: string, stageId: number): string {
  return `/project/${projectId}/stage/${stageId}`;
}

/** `/project/…/stage/4` · hash·query 포함 경로에서 단계 번호 추출 */
export function parseStageIdFromPath(path: string): number | null {
  const m = path.match(/\/stage\/(\d{1,2})(?:[/?#]|$)/);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 && n <= 14 ? n : null;
}

export function backNavLabel(pageName: string): string {
  return `← ${pageName}`;
}

export function forwardNavLabel(pageName: string): string {
  return `${pageName}로 진행 →`;
}

export function backNavLabelForStage(stageId: number): string {
  return backNavLabel(getStagePageName(stageId));
}

export function forwardNavLabelForStage(stageId: number): string {
  return forwardNavLabel(getStagePageName(stageId));
}

export function homeBackNavLabel(): string {
  return backNavLabel(WORKSPACE_HOME_PAGE_NAME);
}

/** 방문 경로 → 표시용 페이지 이름 */
export function pageNameFromVisitPath(path: string): string | null {
  if (path === "/home" || path.startsWith("/home?")) {
    return WORKSPACE_HOME_PAGE_NAME;
  }
  const stageId = parseStageIdFromPath(path);
  if (stageId) return getStagePageName(stageId);
  return null;
}
