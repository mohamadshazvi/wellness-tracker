"use client";

import { useEffect, useState } from "react";
import { useWellnessData } from "../hooks/useWellnessData";
import { emptyEntry, scoreOf } from "../lib/wellness";
import CalendarTab from "../components/CalendarTab";
import ProfileTab from "../components/ProfileTab";
import ProgressRing from "../components/ProgressRing";
import SyncErrorBanner from "../components/SyncErrorBanner";
import StatsTab, { type StatsRange } from "../components/StatsTab";
import TabBar, { type TabId } from "../components/TabBar";
import TodayTab from "../components/TodayTab";
import WeightTab from "../components/WeightTab";
import AuthPanel from "../components/AuthPanel";

export default function Home() {
  const wellness = useWellnessData();
  const [tab, setTab] = useState<TabId>("today");
  // Kept here rather than inside the tabs so navigating away and back
  // preserves the selected range and the viewed month.
  const [statsRange, setStatsRange] = useState<StatsRange>("weekly");
  const [monthOffset, setMonthOffset] = useState(0);
  const [splashDone, setSplashDone] = useState(false);
  const [localMode, setLocalMode] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        setLocalMode(localStorage.getItem("wellness:local-mode") === "yes");
      } catch { /* Storage unavailable; still show onboarding. */ }
      setSplashDone(true);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, []);
  const continueLocally = () => {
    try {
      localStorage.setItem("wellness:local-mode", "yes");
    } catch { /* Local mode can continue in memory for this session. */ }
    setLocalMode(true);
    setTab("today");
  };

  const today = wellness.history[wellness.todayKey] ?? emptyEntry();
  const { done, total } = scoreOf(today);
  const percent = Math.round((done / total) * 100) || 0;

  if (!wellness.loaded || !splashDone) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center" aria-busy="true">
        <h1 className="splash-title text-4xl font-bold tracking-tight text-zinc-50">Wellness</h1>
        <p role="status" className="splash-subtitle mt-3 text-xs font-medium uppercase tracking-[0.3em] text-zinc-400">Daily Focus</p>
        <div aria-hidden="true" className="mt-7 h-px w-32 overflow-hidden bg-zinc-800">
          <div className="splash-progress h-full w-full origin-left bg-emerald-400" />
        </div>
      </main>
    );
  }

  if (!wellness.user && !localMode) return <main className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10">
    <div className="w-full"><AuthPanel onLogin={wellness.login} onLoginWithProvider={wellness.loginWithProvider} onResetPassword={wellness.resetPassword} authError={wellness.authError} onContinueLocally={continueLocally} /></div>
  </main>;

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
              {tab === "weight" ? "Weight Tracker" : "Daily Focus"}
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

      {wellness.offerImport && <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-zinc-900 p-4 text-sm text-zinc-200">
        <p>Bring this device’s guest progress into your account? Your guest copy will remain on this device. Personal Goal is not imported.</p>
        <div className="mt-3 flex gap-3"><button onClick={() => wellness.decideImport(true)} className="rounded-lg bg-emerald-500 px-3 py-2 text-zinc-950">Import progress</button><button onClick={() => wellness.decideImport(false)} className="rounded-lg border border-zinc-700 px-3 py-2">Not now</button></div>
      </div>}
      {tab === "today" && <TodayTab key={`${wellness.user?.uid ?? "guest"}:${wellness.todayKey}`} today={today} todayKey={wellness.todayKey} updateToday={wellness.updateToday} extras={wellness.extras} privateChecked={!!wellness.privateDays[wellness.todayKey]} togglePersonalGoal={wellness.togglePersonalGoal} toggleQuest={wellness.toggleQuest} onWeightOpen={() => setTab("weight")} />}

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
          weights={wellness.extras.weights}
          monthOffset={monthOffset}
          range={statsRange}
          onRangeChange={setStatsRange}
        />
      )}

      {tab === "weight" && <WeightTab key={`${wellness.user?.uid ?? "guest"}:${wellness.todayKey}`} weights={wellness.extras.weights} todayKey={wellness.todayKey} onSave={wellness.saveWeight} />}

      {tab === "profile" && <ProfileTab wellness={wellness} onContinueLocally={continueLocally} />}

      <TabBar tab={tab} onTabChange={setTab} />
    </main>
  );
}
