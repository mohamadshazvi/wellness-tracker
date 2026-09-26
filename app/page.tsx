"use client";

import { useState } from "react";
import { useWellnessData } from "../hooks/useWellnessData";
import { emptyEntry, scoreOf } from "../lib/wellness";
import CalendarTab from "../components/CalendarTab";
import ProfileTab from "../components/ProfileTab";
import ProgressRing from "../components/ProgressRing";
import SyncErrorBanner from "../components/SyncErrorBanner";
import StatsTab, { type StatsRange } from "../components/StatsTab";
import TabBar, { type TabId } from "../components/TabBar";
import TodayTab from "../components/TodayTab";

export default function Home() {
  const wellness = useWellnessData();
  const [tab, setTab] = useState<TabId>("today");
  // Kept here rather than inside the tabs so navigating away and back
  // preserves the selected range and the viewed month.
  const [statsRange, setStatsRange] = useState<StatsRange>("weekly");
  const [monthOffset, setMonthOffset] = useState(0);

  const today = wellness.history[wellness.todayKey] ?? emptyEntry();
  const { done, total } = scoreOf(today);
  const percent = Math.round((done / total) * 100) || 0;

  if (!wellness.loaded) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-5 pt-10" aria-busy="true">
        <p role="status" className="mb-8 text-sm text-zinc-400">Loading your wellness tracker…</p>
        <div aria-hidden="true" className="space-y-6">
          <div className="skeleton h-12 w-48 rounded-xl" />
          <div className="skeleton h-72 rounded-3xl" />
          <div className="skeleton h-56 rounded-3xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-32 pt-10">
      {tab !== "profile" && (
        <header className="mb-8 flex items-center justify-between animate-fade-up">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wider text-zinc-400">
              {new Date(`${wellness.todayKey}T12:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-[32px] font-bold tracking-tight leading-tight text-zinc-50 drop-shadow-sm">
              Daily Focus
            </h1>
          </div>
          {tab === "today" && <ProgressRing percent={percent} />}
        </header>
      )}

      {/* The Profile tab shows the same failure inline in its sync section. */}
      {tab !== "profile" && wellness.syncError && (
        <SyncErrorBanner
          message={wellness.syncError}
          busy={wellness.syncStatus === "saving"}
          onRetry={wellness.syncData}
        />
      )}

      {tab === "today" && (
        <TodayTab key={`${wellness.user?.uid ?? "guest"}:${wellness.todayKey}`} today={today} updateToday={wellness.updateToday} />
      )}

      {tab === "calendar" && (
        <CalendarTab
          history={wellness.history}
          todayKey={wellness.todayKey}
          monthOffset={monthOffset}
          onMonthOffsetChange={setMonthOffset}
        />
      )}

      {tab === "stats" && (
        <StatsTab
          history={wellness.history}
          monthOffset={monthOffset}
          range={statsRange}
          onRangeChange={setStatsRange}
        />
      )}

      {tab === "profile" && <ProfileTab wellness={wellness} />}

      <TabBar tab={tab} onTabChange={setTab} />
    </main>
  );
}
