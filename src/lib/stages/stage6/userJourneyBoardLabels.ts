import type { JourneyMapItem, JourneyStepZone } from "@/lib/stages/stage6/userJourneyTypes";

export const JOURNEY_BOARD_ROW_LABELS = {
  step: "여정 단계",
  stepHint: "시간 순 행동",
  behavior: "사용자 행동",
  behaviorHint: "언급 · 관찰",
  touchpoint: "터치포인트",
  touchpointHint: "Touchpoint",
  feeling: "사용자 감정",
  feelingHint: "감정의 폭",
  pain_point: "Pain point",
  pain_pointHint: "불편 · 장애",
} as const;

export type JourneyBoardContentRow = Exclude<
  keyof typeof JOURNEY_BOARD_ROW_LABELS,
  | "step"
  | "stepHint"
  | "behaviorHint"
  | "touchpointHint"
  | "feelingHint"
  | "pain_pointHint"
>;

export const JOURNEY_BOARD_CONTENT_ROWS: JourneyStepZone[] = [
  "behavior",
  "touchpoint",
  "pain_point",
  "feeling",
];

export const JOURNEY_BOARD_PLACEHOLDERS = {
  stepName: "예: 문제 인지",
  zoneDrop: "필요하면 카드를 끌어다 조정",
  zoneDropActive: "여기에 놓기",
  aiZoneDrop: "리서치 카드를 놓거나, 아래 추가·AI로 항목을 채우세요",
  aiTextPlaceholder: "내용을 입력하세요",
  aiGenerate: "AI로 추가하기",
  aiGenerating: "작성 중…",
  aiNeedsItems: "이 단계에 리서치 카드가 있으면 AI가 더 잘 도와줘요.",
  aiEntryAdd: "항목 추가",
  aiEntryRemove: "항목 삭제",
  behaviorDrop: "초안이 비어 있으면 카드를 끌어다 놓기",
  behaviorDropActive: "여기에 놓기",
  touchpointDrop: "터치포인트 근거 카드를 끌어다 놓기",
  touchpointDropActive: "여기에 놓기",
  feelingDrop: "Pain point를 채우면 감정의 폭이 여기에 그려져요",
  feelingDropActive: "여기에 놓기",
  feelingCurveEmpty: "Pain point를 채우면 감정의 폭이 여기에 그려져요",
  pain_pointDrop: "Pain point 근거 카드를 끌어다 놓기",
  pain_pointDropActive: "여기에 놓기",
  poolAll: "배치 전 조사 카드",
  poolAllEmpty: "언급·관찰 카드가 여기 모여요",
  poolBehavior: "배치 전 언급·관찰",
  poolBehaviorEmpty: "언급·관찰 카드가 여기 모여요",
  poolAllPlaced: "이 페르소나의 항목이 여정 단계에 초안으로 배치됐어요. 위치만 다듬어 보세요.",
  poolNoSourceData:
    "아직 조사 데이터가 없어요. 발견 정리하기에서 언급·관찰을 정리하면 여기에 모여요.",
  goToStage4Cta: "발견 정리하기에서 입력하기",
} as const;

export function zoneDropPlaceholder(zone: JourneyStepZone): string {
  const key = `${zone}Drop` as keyof typeof JOURNEY_BOARD_PLACEHOLDERS;
  return JOURNEY_BOARD_PLACEHOLDERS[key] ?? JOURNEY_BOARD_PLACEHOLDERS.zoneDrop;
}

export function zoneDropActivePlaceholder(zone: JourneyStepZone): string {
  const key = `${zone}DropActive` as keyof typeof JOURNEY_BOARD_PLACEHOLDERS;
  return (
    JOURNEY_BOARD_PLACEHOLDERS[key] ??
    JOURNEY_BOARD_PLACEHOLDERS.zoneDropActive
  );
}

/** @deprecated zone별 배치로 대체 */
export function splitJourneyStepItems(items: JourneyMapItem[]): {
  behavior: JourneyMapItem[];
  needs: JourneyMapItem[];
} {
  return {
    behavior: items.filter(
      (item) => item.kind === "quote" || item.kind === "observation",
    ),
    needs: [],
  };
}

/** @deprecated 단일 풀 표시로 대체 */
export function splitJourneyPoolItems(items: JourneyMapItem[]): {
  behavior: JourneyMapItem[];
  needs: JourneyMapItem[];
} {
  return splitJourneyStepItems(items);
}
