/** 전역 코치·UI 모션 배율 (1 = 기본, 0.7 ≈ 30% 빠름) */
export const MOTION_SPEED_FACTOR = 0.7;

const motionMs = (base: number) => Math.round(base * MOTION_SPEED_FACTOR);

/** 스테이지 진입 · 2열(작업→코치) · 코치 순차 발화 타이밍 */
export const MOTION = {
  stageRevealMs: motionMs(480),
  stageStaggerMs: motionMs(90),
  /** 2열 레이아웃: 좌 작업(index 0) → 우 코치(index 1) */
  columnWorkRevealIndex: 0,
  columnCoachRevealIndex: 1,
  /** 작업 열 등장 후 내부 블록 스태거 시작 */
  workBlockAfterColumnMs: motionMs(480),
  /** 코치 열 등장 후 순차 발화 시작 */
  coachDialogStartDelayMs: motionMs(570),
  coachTypingMs: motionMs(880),
  coachPauseAfterMs: motionMs(280),
  coachFirstMessageDelayMs: motionMs(260),
  /** Kevin 발화 · 글자(그래핌)당 간격 — Lemonade 스타일 타이핑 */
  coachRevealTokenMs: motionMs(32),
  coachRevealSpaceMs: motionMs(9),
  /** 사용자 전송(입력·예시 칩) 후 말풍선 등장 전 */
  userTurnBeforeShowMs: motionMs(520),
  /** 사용자 말풍선 fade-in (coach-message-in duration) */
  userTurnRevealMs: motionMs(580),
  /** 코치 라이브 말풍선 fade-in */
  coachTurnRevealMs: motionMs(480),
  /** 사용자 말풍선 표시 후 코치 타이핑·응답 시작 전 읽기 여유 */
  coachReplyAfterUserMs: motionMs(1200),
  /** API·로컬 응답 수신 후 코치 말풍선·타이핑 시작 전 */
  coachReplyAfterFetchMs: motionMs(480),
  workBlockStaggerMs: motionMs(85),
  /** 타이핑 점 애니메이션 주기 */
  coachTypingDotCycleMs: motionMs(1000),
  coachTypingDotStaggerMs: motionMs(150),
  /** 커서 깜빡임 */
  coachRevealCursorBlinkMs: motionMs(850),
} as const;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
