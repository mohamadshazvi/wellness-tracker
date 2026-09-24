"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { COLORS } from "../lib/theme";
import {
  buildDateKey,
  getMonthView,
  scoreOf,
  type History,
} from "../lib/wellness";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function CalendarTab({
  history,
  todayKey,
  monthOffset,
  onMonthOffsetChange,
}: {
  history: History;
  todayKey: string;
  monthOffset: number;
  onMonthOffsetChange: (updater: (offset: number) => number) => void;
}) {
  const { year, monthIndex, label, cells } = getMonthView(monthOffset);

  return (
    <div className="animate-fade-up rounded-3xl bg-zinc-900/80 p-6 shadow-2xl border border-white/5 backdrop-blur-xl">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => onMonthOffsetChange((m) => m - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[16px] font-bold text-zinc-50 tracking-wide">
          {label}
        </h2>
        <button
          onClick={() => onMonthOffsetChange((m) => m + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="mb-3 text-[12px] font-bold text-zinc-500">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = buildDateKey(year, monthIndex, day);
          const score = history[key] ? scoreOf(history[key]) : null;
          const pct = score ? score.done / score.total : 0;
          return (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-xl text-[13px] font-semibold transition-all duration-300"
              style={{
                backgroundColor:
                  pct > 0
                    ? pct === 1
                      ? "rgba(245, 158, 11, 0.2)"
                      : `rgba(16,185,129,${0.15 + pct * 0.4})`
                    : "transparent",
                color:
                  pct === 1
                    ? COLORS.amber
                    : pct > 0
                      ? COLORS.emerald
                      : COLORS.line,
                border: `1px solid ${pct === 1 ? "rgba(245, 158, 11, 0.4)" : pct > 0 ? `rgba(16,185,129,${pct})` : COLORS.cardBorder}`,
                outline: key === todayKey ? `2px solid ${COLORS.emerald}` : "none",
                outlineOffset: "2px",
                boxShadow:
                  pct === 1 ? "0 0 10px rgba(245, 158, 11, 0.2)" : "none",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
