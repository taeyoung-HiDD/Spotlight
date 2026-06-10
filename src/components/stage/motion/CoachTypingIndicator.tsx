import { MOTION } from "@/lib/motion/timings";

export function CoachTypingIndicator() {
  const cycleSec = MOTION.coachTypingDotCycleMs / 1000;
  const staggerSec = MOTION.coachTypingDotStaggerMs / 1000;

  return (
    <div
      className="flex items-center gap-1 rounded-[10px] bg-surface px-3 py-2.5"
      role="status"
      aria-label="코치가 입력 중"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="coach-typing-dot size-1.5 rounded-full bg-muted"
          style={{
            animation: `coach-typing ${cycleSec}s ease-in-out infinite`,
            animationDelay: `${i * staggerSec}s`,
          }}
        />
      ))}
    </div>
  );
}
