"use client";

import { COLORS } from "../lib/theme";

export default function ProgressRing({ percent }: { percent: number }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (percent / 100) * circumference;

  // Choose color based on completion
  const strokeColor = percent === 100 ? COLORS.amber : COLORS.emerald;
  const glowShadow =
    percent === 100
      ? "drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]"
      : percent > 0
        ? "drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]"
        : "";

  return (
    <div
      className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-zinc-900 shadow-xl border border-white/5 ${glowShadow} transition-all duration-700`}
    >
      <svg width="88" height="88" className="-rotate-90 transform">
        <circle
          cx="44"
          cy="44"
          r="42"
          fill="none"
          stroke={COLORS.cardBorder}
          strokeWidth="5"
        />
        <circle
          cx="44"
          cy="44"
          r="42"
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          className={`text-[18px] font-bold transition-colors duration-500 ${percent === 100 ? "text-amber-500" : "text-zinc-50"}`}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}
