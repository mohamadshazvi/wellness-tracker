"use client";

import { useMemo, useState } from "react";
import { Award } from "lucide-react";
import Section from "./Section";
import { COLORS } from "../lib/theme";
import {
  ACHIEVEMENTS,
  allStreaks,
  emptyEntry,
  syncedLabel,
  perfectDaySummary,
  type History,
} from "../lib/wellness";

export default function AccountPanel({
  user,
  history,
  todayKey,
  syncStatus,
  syncError,
  lastSyncedAt,
  onSync,
  onLogout,
  onChangeName,
}: {
  user: { email: string; uid: string; name: string; joinedAt: string | null };
  history: History;
  todayKey: string;
  syncStatus: "idle" | "saving" | "saved" | "error";
  syncError: string | null;
  lastSyncedAt: number | null;
  onSync: () => Promise<boolean>;
  onLogout: () => void;
  onChangeName: (name: string) => Promise<boolean>;
}) {
  const [nameStatus, setNameStatus] = useState("");
  const summary = perfectDaySummary(history);
  const unlocked = useMemo(() => {
    const streaks = allStreaks(history);
    const today = history[todayKey] ?? emptyEntry();
    return ACHIEVEMENTS.filter((a) => a.check(streaks, today));
  }, [history, todayKey]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-zinc-900/80 p-6 shadow-2xl border border-white/5 backdrop-blur-xl flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[24px] font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          {(user.name || user.email).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[18px] font-bold text-zinc-50">{user.name || "Wellness member"}</p>
          <p className="text-[13px] text-zinc-400">{user.email}</p>
          {user.joinedAt && <p className="text-xs text-zinc-500">Joined {new Date(user.joinedAt).toLocaleDateString()}</p>}
        </div>
      </div>

      <Section title="Your Progress"><div className="grid grid-cols-2 gap-3 py-3 text-sm text-zinc-400">
        <p>Longest perfect streak <strong className="block text-xl text-zinc-50">{summary.longest} days</strong></p>
        <p>Total perfect days <strong className="block text-xl text-zinc-50">{summary.total}</strong></p>
      </div></Section>

      <Section title="Database Sync">
        <div className="py-4">
          <p className="text-[14px] text-zinc-400 mb-6 leading-relaxed">
            Changes are saved locally and synced automatically while you are
            signed in.
          </p>
          {/* Announced to assistive tech; the dot row above is decorative. */}
          <p
            role="status"
            aria-live="polite"
            className="mb-4 flex items-center gap-2 text-[12px] font-medium"
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${syncStatus === "saving" ? "animate-pulse bg-amber-400" : syncStatus === "error" ? "bg-rose-400" : "bg-emerald-400"}`}
            />
            <span className="text-zinc-500">
              {syncStatus === "saving"
                ? "Saving to cloud..."
                : syncStatus === "error"
                  ? "Cloud sync needs attention"
                  : "Cloud sync is on"}
            </span>
          </p>
          {syncError && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-rose-200"
            >
              {syncError}
            </p>
          )}
          <button
            onClick={() => void onSync()}
            disabled={syncStatus === "saving"}
            className="w-full rounded-xl bg-zinc-800 border border-zinc-700 py-4 text-[15px] font-bold text-zinc-50 transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {syncStatus === "saving" ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-zinc-400 border-t-zinc-50 animate-spin" />
                Syncing...
              </>
            ) : syncStatus === "saved" ? (
              "Saved to cloud"
            ) : (
              "Sync now"
            )}
          </button>
          {lastSyncedAt !== null && (
            <p className="mt-3 text-center text-[12px] text-zinc-500">
              Last synced {syncedLabel(lastSyncedAt)}
            </p>
          )}
        </div>
      </Section>

      <Section title="Achievements">
        <div className="py-2 space-y-3">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlocked.some((u) => u.id === a.id);
            return (
              <div
                key={a.id}
                className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isUnlocked ? "bg-zinc-800/50 border-zinc-700 shadow-sm" : "bg-zinc-950/30 border-zinc-900/50 opacity-60"}`}
              >
                <div
                  className="flex-shrink-0"
                  style={{ color: isUnlocked ? COLORS[a.color] : COLORS.muted }}
                >
                  <Award size={24} />
                </div>
                <div>
                  <p
                    className={`text-[14px] font-bold ${isUnlocked ? "text-zinc-50" : "text-zinc-500"}`}
                  >
                    {a.title}
                  </p>
                  <p className="text-[12px] text-zinc-400 mt-0.5">{a.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Settings"><form onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = form.elements.namedItem("displayName") as HTMLInputElement;
        const success = await onChangeName(input.value);
        setNameStatus(success ? "Name saved" : "Could not save name");
      }} className="space-y-3 py-3">
        <label className="block text-sm text-zinc-400">Display name<input name="displayName" key={user.name} defaultValue={user.name} required className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-50" /></label>
        <button type="submit" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200">Save name</button>
        <p role="status" className="text-xs text-zinc-400">{nameStatus}</p>
      </form></Section>

      <button
        onClick={onLogout}
        className="w-full rounded-xl border-2 border-zinc-800 py-4 text-[15px] font-bold text-zinc-400 transition-all hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95"
      >
        Sign Out
      </button>
    </div>
  );
}
