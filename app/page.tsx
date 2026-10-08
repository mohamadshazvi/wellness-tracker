"use client";

import { useEffect, useState } from "react";
import { useWellnessData } from "../hooks/useWellnessData";
import { editableDayKeys, emptyEntry, scoreOf } from "../lib/wellness";
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
  const [daySelection, setDaySelection] = useState<{ day: string; anchor: string; identity: string } | null>(null);
  const identity = wellness.user?.uid ?? "guest";
  const editableDays = editableDayKeys(wellness.todayKey);
  // Reset to today after midnight or an account change; never reinterpret an
  // old selection as a different day's checklist.
  const selectedDay = daySelection?.anchor === wellness.todayKey && daySelection.identity === identity &&
    editableDays.includes(daySelection.day) ? daySelection.day : wellness.todayKey;

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

  const today = wellness.history[selectedDay] ?? emptyEntry();
  const { done, total } = scoreOf(today);
  const percent = Math.round((done / total) * 100) || 0;

  if (!wellness.loaded || !splashDone) {
    return (
      <main className="app-screen flex flex-col items-center justify-center text-center" aria-busy="true">
        <h1 className="splash-title text-4xl font-bold tracking-tight text-zinc-50">Wellness</h1>
        <p role="status" className="splash-subtitle mt-3 text-xs font-medium uppercase tracking-[0.3em] text-zinc-400">Daily Focus</p>
        <div aria-hidden="true" className="mt-7 h-px w-32 overflow-hidden bg-zinc-800">
          <div className="splash-progress h-full w-full origin-left bg-emerald-400" />
        </div>
      </main>
    );
  }

  if (!wellness.user && !localMode) return <main className="app-screen mx-auto flex max-w-md items-center">
    <div className="w-full"><AuthPanel onLogin={wellness.login} onLoginWithProvider={wellness.loginWithProvider} onResetPassword={wellness.resetPassword} authError={wellness.authError} onContinueLocally={continueLocally} /></div>
  </main>;

  return (
    <main className="app-screen app-screen-with-tabs mx-auto max-w-md">
      {tab !== "profile" && (
        <header className="mb-8 flex items-center justify-between animate-fade-up">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wider text-zinc-400">
              {new Date(`${tab === "today" ? selectedDay : wellness.todayKey}T12:00:00`).toLocaleDateString("en-US", {
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
      {tab === "today" && <>
        <div className="mb-6">
          <div role="group" aria-label="Daily activity date" className="flex gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-2">
            {editableDays.map((day, index) => <button
              key={day}
              type="button"
              aria-pressed={selectedDay === day}
              onClick={() => setDaySelection({ day, anchor: wellness.todayKey, identity })}
              className={`flex-1 rounded-xl px-2 py-3 text-sm font-medium transition-colors ${selectedDay === day ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
            >{["Today", "Yesterday", "2 days ago"][index]}</button>)}
          </div>
          <p role="status" className="mt-3 text-xs text-zinc-400">
            {selectedDay === wellness.todayKey ? "You can also update activities from the previous two days." : `Editing ${selectedDay}. Changes are saved automatically. Weekly quests are available on Today.`}
          </p>
        </div>
        <TodayTab
          key={`${identity}:${selectedDay}`}
          today={today}
          todayKey={wellness.todayKey}
          updateToday={(patch) => wellness.updateDay(selectedDay, patch)}
          extras={wellness.extras}
          privateChecked={!!wellness.privateDays[selectedDay]}
          togglePersonalGoal={() => wellness.togglePersonalGoal(selectedDay)}
          toggleQuest={wellness.toggleQuest}
          showWeeklyQuests={selectedDay === wellness.todayKey}
          onWeightOpen={() => setTab("weight")}
        />
      </>}

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
