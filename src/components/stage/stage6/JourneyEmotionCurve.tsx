"use client";

import { useId, useMemo } from "react";
import { JOURNEY_BOARD_PLACEHOLDERS } from "@/lib/stages/stage6/userJourneyBoardLabels";
import type { JourneyEmotionPoint } from "@/lib/stages/stage6/journeyEmotionFromPain";

const VIEW_H = 112;
const COL_W = 100;
const PAD_Y = 18;
const MID_Y = VIEW_H / 2;

type JourneyEmotionCurveProps = {
  points: JourneyEmotionPoint[];
  className?: string;
};

function scoreToY(score: number): number {
  const amp = (VIEW_H / 2 - PAD_Y) * 0.92;
  return MID_Y - score * amp;
}

/** Catmull-Rom → cubic Bézier path through column centers */
function buildSmoothPath(
  xs: number[],
  ys: number[],
): string {
  if (xs.length === 0) return "";
  if (xs.length === 1) {
    return `M ${xs[0]! - 24} ${ys[0]!} L ${xs[0]! + 24} ${ys[0]!}`;
  }

  const pts = xs.map((x, i) => ({ x, y: ys[i]! }));
  // Extend slightly past first/last for arrow flow
  const extended = [
    { x: pts[0]!.x - COL_W * 0.35, y: pts[0]!.y },
    ...pts,
    { x: pts[pts.length - 1]!.x + COL_W * 0.35, y: pts[pts.length - 1]!.y },
  ];

  let d = `M ${extended[0]!.x} ${extended[0]!.y}`;
  for (let i = 0; i < extended.length - 1; i += 1) {
    const p0 = extended[Math.max(0, i - 1)]!;
    const p1 = extended[i]!;
    const p2 = extended[i + 1]!;
    const p3 = extended[Math.min(extended.length - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function JourneyEmotionCurve({
  points,
  className,
}: JourneyEmotionCurveProps) {
  const uid = useId().replace(/:/g, "");
  const markerId = `emotion-arrow-${uid}`;

  const { width, pathD } = useMemo(() => {
    const n = Math.max(points.length, 1);
    const w = n * COL_W;
    const xCoords = points.map((_, i) => COL_W * i + COL_W / 2);
    const yCoords = points.map((p) => scoreToY(p.score));
    return {
      width: w,
      pathD: buildSmoothPath(xCoords, yCoords),
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div
        className={[
          "user-journey-board__emotion flex min-h-[7.5rem] items-center justify-center px-3",
          className ?? "",
        ].join(" ")}
      >
        <p className="user-journey-board__zone-placeholder text-center break-keep">
          {JOURNEY_BOARD_PLACEHOLDERS.feelingCurveEmpty}
        </p>
      </div>
    );
  }

  return (
    <div
      className={[
        "user-journey-board__emotion relative min-h-[7.5rem] w-full overflow-hidden",
        className ?? "",
      ].join(" ")}
      role="img"
      aria-label="여정 단계별 사용자 감정 곡선. Pain point 수와 정도에 따라 오르내립니다."
    >
      <svg
        className="user-journey-board__emotion-svg block h-[7.5rem] w-full"
        viewBox={`0 0 ${width} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#E91E8C" />
          </marker>
        </defs>

        {/* Column guides */}
        {points.slice(1).map((_, i) => (
          <line
            key={`guide-${i}`}
            x1={(i + 1) * COL_W}
            y1={4}
            x2={(i + 1) * COL_W}
            y2={VIEW_H - 4}
            stroke="var(--border-warm, #e8e4dc)"
            strokeWidth={1}
            strokeOpacity={0.7}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Neutral baseline */}
        <line
          x1={0}
          y1={MID_Y}
          x2={width}
          y2={MID_Y}
          stroke="#64B5F6"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          strokeOpacity={0.85}
          vectorEffect="non-scaling-stroke"
        />

        {/* Emotion curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#E91E8C"
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={`url(#${markerId})`}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Emoji markers — HTML so they don't distort with preserveAspectRatio=none */}
      <div className="pointer-events-none absolute inset-0">
        {points.map((point, i) => {
          const leftPct = ((i + 0.5) / points.length) * 100;
          const topPct = (scoreToY(point.score) / VIEW_H) * 100;
          return (
            <span
              key={point.stepId}
              className="user-journey-board__emotion-emoji absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#F8BBD0]/80 bg-panel text-[18px] shadow-sm"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              title={point.ariaLabel}
              aria-hidden
            >
              {point.emoji}
            </span>
          );
        })}
      </div>

      <span className="sr-only">
        {points
          .map((p) => `${p.stepLabel}: ${p.ariaLabel}`)
          .join(". ")}
      </span>
    </div>
  );
}
