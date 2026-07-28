"use client";

/** 코치·AI가 내용을 분석·생성하는 중임을 나타내는 점 3개 펄스 */
export function ThinkingDots({ size = "sm" }: { size?: "sm" | "md" }) {
  const dotSize = size === "md" ? "size-2" : "size-1.5";
  return (
    <div className="flex items-center justify-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`coach-typing-dot ${dotSize} rounded-full bg-muted`}
          style={{ animation: `coach-typing 1s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}
