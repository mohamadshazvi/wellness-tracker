"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Flame, Target } from "lucide-react";
import Section from "./Section";
import { COLORS } from "../lib/theme";
import {
  PREDICATES,
  emptyEntry,
  getLocalISODate,
  getMonthView,
  isFullDay,
  monthKeyPrefix,
  scoreOf,
  type DayEntry,
  type History,
} from "../lib/wellness";

export type StatsRange = "weekly" | "monthly";

const RANGES: [StatsRange, string][] = [
  ["weekly", "7D"],
  ["monthly", "30D"],
];

const TOOLTIP_STYLE = {
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "rgba(24,24,27,0.9)",
  backdropFilter: "blur(8px)",
  color: "#FAFAFA",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

function calculateTotals(entries: [string, DayEntry][]) {
  return {
    prayerDays: entries.filter(([, e]) => PREDICATES.prayer(e)).length,
    gymDays: entries.filter(([, e]) => e.gymDay).length,
    perfectDays: entries.filter(([, e]) => isFullDay(e)).length,
  };
}

export default function StatsTab({
  history,
  weights,
  monthOffset,
  range,
  onRangeChange,
}: {
  history: History;
  weights: Record<string, { weight: number | null }>;
  monthOffset: number;
  range: StatsRange;
  onRangeChange: (range: StatsRange) => void;
}) {
  const { year, monthIndex } = getMonthView(monthOffset);

  const monthEntries = [...new Set([...Object.keys(history), ...Object.keys(weights)])]
    .filter((k) => k.startsWith(monthKeyPrefix(year, monthIndex)) && (!!history[k] || weights[k]?.weight != null))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => [key, history[key] ?? emptyEntry()] as [string, DayEntry]);
  const weeklyEntries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i)); // Chronological order
    const key = getLocalISODate(d);
    return [key, history[key] ?? emptyEntry()] as [string, DayEntry];
  });

  const activeEntries = range === "monthly" ? monthEntries : weeklyEntries;
  const activeTotals = calculateTotals(activeEntries);

  const chartData = activeEntries.map(([date, entry]) => ({
    name: date.slice(5).replace("-", "/"), // e.g., 09/10
    score: scoreOf(entry).done,
    weight: weights[date]?.weight ?? null,
  }));

  return (
    <div className="animate-fade-up space-y-6">
      <Section
        title="Progress Charts"
        extraHeader={
          <div className="flex rounded-lg bg-zinc-800 p-1 border border-white/5">
            {RANGES.map(([value, label]) => (
              <button
                key={value}
                onClick={() => onRangeChange(value)}
                className={`rounded-md px-4 py-1 text-[11px] font-bold uppercase transition-all ${range === value ? "bg-zinc-700 text-zinc-50 shadow-md" : "text-zinc-400 hover:text-zinc-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div className="pt-4">
          <p className="mb-4 text-[13px] font-semibold text-zinc-400 flex items-center gap-2">
            <Flame size={16} className="text-emerald-500" /> Habits Completed
          </p>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.filter((d) => d.score > 0)}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: COLORS.muted }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: COLORS.emerald, fontWeight: "bold" }}
                />
                <Bar
                  dataKey="score"
                  fill="url(#emeraldGradient)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient
                    id="emeraldGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={COLORS.emerald}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLORS.emerald}
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {range === "monthly" && (
            <>
              <p className="mb-4 mt-8 text-[13px] font-semibold text-zinc-400 flex items-center gap-2">
                <Target size={16} className="text-amber-500" /> Weight Trend (kg)
              </p>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.filter((d) => d.weight !== null)}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: COLORS.muted }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      interval="preserveStartEnd"
                      minTickGap={18}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      itemStyle={{ color: COLORS.amber, fontWeight: "bold" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke={COLORS.amber}
                      strokeWidth={3}
                      dot={{
                        fill: COLORS.bg,
                        stroke: COLORS.amber,
                        strokeWidth: 2,
                        r: 4,
                      }}
                      activeDot={{
                        r: 6,
                        fill: COLORS.amber,
                        stroke: COLORS.bg,
                      }}
                      connectNulls
                      style={{
                        filter: `drop-shadow(0px 4px 8px ${COLORS.amberSoft})`,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title="Activity Summary">
        <div className="grid grid-cols-2 gap-4 py-4">
          {[
            {
              label: "Prayer Days",
              value: activeTotals.prayerDays,
              color: COLORS.indigo,
              bg: COLORS.indigoSoft,
              border: "rgba(99, 102, 241, 0.2)",
            },
            {
              label: "Gym Sessions",
              value: activeTotals.gymDays,
              color: COLORS.rose,
              bg: COLORS.roseSoft,
              border: "rgba(244, 63, 94, 0.2)",
            },
            {
              label: "Perfect Days",
              value: activeTotals.perfectDays,
              color: COLORS.amber,
              bg: COLORS.amberSoft,
              border: "rgba(245, 158, 11, 0.2)",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5 shadow-lg backdrop-blur-md border"
              style={{ backgroundColor: s.bg, borderColor: s.border }}
            >
              <p
                className="text-[32px] font-bold tracking-tight"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-zinc-400">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
