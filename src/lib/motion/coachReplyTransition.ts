import { MOTION_SPEED_FACTOR } from "@/lib/motion/timings";

const motionMs = (base: number) => Math.round(base * MOTION_SPEED_FACTOR);

/** 코치 발화 타이핑 종료 후 추가로 읽을 시간(ms) */
export const COACH_READ_MIN_MS = motionMs(1200);
export const COACH_READ_MAX_MS = motionMs(5200);

export function coachReadDelayMs(
  text: string,
  options?: { min?: number; max?: number },
): number {
  const min = options?.min ?? COACH_READ_MIN_MS;
  const max = options?.max ?? COACH_READ_MAX_MS;
  const readableLength = text.replace(/\s+/g, "").length;
  return Math.min(
    max,
    Math.max(min, motionMs(700) + readableLength * motionMs(55)),
  );
}

export function scheduleAfterCoachRead(
  callback: () => void,
  replyText: string,
  timerRef: { current: number | null },
  options?: { min?: number; max?: number },
): void {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
  }
  timerRef.current = window.setTimeout(
    callback,
    coachReadDelayMs(replyText, options),
  );
}
