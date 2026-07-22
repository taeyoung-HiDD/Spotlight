import { artifactMessageKey, stageNavMessageKey, t } from "@/lib/i18n/t";
import type { UiLocale } from "@/lib/i18n/uiLocale";
import { SIDEBAR_MACRO_GROUPS, getSidebarStage } from "@/lib/stages/sidebarNav";

/** 자료실 카드·상세 제목 — 단계 활동명이 아닌 산출물 이름 (ko 기본) */
export const ARCHIVE_ARTIFACT_LABELS: Record<number, string> = {
  1: "프로젝트 개요 및 문제 정의서",
  2: "사전 조사 리포트",
  3: "리서치 준비서",
  4: "조사 발견 정리서",
  5: "사용자 여정 지도",
  6: "잠재 니즈 보드",
  7: "HMW 질문 보드",
  8: "아이디어 그리드",
  9: "우선순위 매트릭스",
  10: "컨셉 시트",
  11: "인터랙티브 시제품",
  12: "사용성 테스트 결과",
  13: "사업 타당성 시트",
  14: "90일 실행 계획",
  15: "피치 덱",
  16: "투자·지원 연결 자료",
};

/** 매크로 내 순번 — 예: 1-1, 1-2, 2-1 */
export function archiveStageCode(stageId: number): string {
  for (let macroIdx = 0; macroIdx < SIDEBAR_MACRO_GROUPS.length; macroIdx++) {
    const group = SIDEBAR_MACRO_GROUPS[macroIdx]!;
    const stageIdx = group.stages.findIndex((s) => s.id === stageId);
    if (stageIdx >= 0) {
      return `${macroIdx + 1}-${stageIdx + 1}`;
    }
  }
  return String(stageId);
}

export function archiveArtifactLabel(
  stageId: number,
  locale: UiLocale = "ko",
): string {
  const key = artifactMessageKey(stageId);
  if (key) return t(locale, key);
  return (
    ARCHIVE_ARTIFACT_LABELS[stageId] ??
    getSidebarStage(stageId)?.navLabel ??
    `${t(locale, "stage.prefix")} ${stageId}`
  );
}

export function archiveStageNavLabel(
  stageId: number,
  locale: UiLocale = "ko",
): string {
  const key = stageNavMessageKey(stageId);
  if (key) return t(locale, key);
  return getSidebarStage(stageId)?.navLabel ?? `${t(locale, "stage.prefix")} ${stageId}`;
}

/** 자료실 eyebrow — 예: 단계 1-1. 문제 정의하기 / Stage 1-1. Define the problem */
export function formatArchiveStageEyebrow(
  stageId: number,
  stageNavLabel?: string,
  locale: UiLocale = "ko",
): string {
  const nav =
    stageNavLabel?.trim() ||
    archiveStageNavLabel(stageId, locale);
  return `${t(locale, "stage.prefix")} ${archiveStageCode(stageId)}. ${nav}`;
}
