"use client";

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

export function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 3,
  color = "#a855f7",
  trackColor = "rgba(168, 85, 247, 0.15)",
}: CircularProgressProps) {
  const deg = Math.min(progress, 1) * 360;

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${trackColor} 0deg, transparent 0deg)`,
        }}
      />
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: `conic-gradient(${color} 0deg, ${color} ${deg}deg, transparent ${deg}deg)`,
        }}
      />
      <div
        className="absolute rounded-full z-10"
        style={{
          inset: strokeWidth,
          background: "#0a0a0f",
        }}
      />
      <div className="relative z-20 flex flex-col items-center">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{
            color,
            fontFamily: "var(--font-caveat), cursive",
          }}
        >
          {Math.round(Math.min(progress, 1) * 100)}
        </span>
        <span
          className="text-[10px] uppercase tracking-widest mt-0.5"
          style={{ color: "rgba(168, 85, 247, 0.6)" }}
        >
          %
        </span>
      </div>
    </div>
  );
}
