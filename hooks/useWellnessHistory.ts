"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import {
  editableDayKeys,
  getLocalISODate,
  syncErrorMessage,
  updateRecentDay,
  type DayEntry,
} from "../lib/wellness";
import {
  commitStore,
  fetchStore,
  loadLocalStore,
  mergeStores,
  saveLocalStore,
  type WellnessStore,
} from "../lib/wellnessRepository";
import { emptyStore } from "../lib/wellnessRepository";
import { weekKey, type QuestId, type WeightRecord } from "../lib/extras";
import { storageKeyFor } from "../lib/wellness";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export function useWellnessHistory(todayKey: string) {
  const [store, setStore] = useState<WellnessStore>(emptyStore);
  const [privateDays, setPrivateDays] = useState<Record<string, boolean>>({});
  const [offerImport, setOfferImport] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Called in the auth listener's batch so identity and history move together.
  const onIdentityChange = useCallback((nextUid: string | null) => {
    setSyncError(null);
    setSyncStatus("idle");
    setLastSyncedAt(null);
    setStore(loadLocalStore(nextUid));
    try {
      const raw = localStorage.getItem(`${storageKeyFor(nextUid)}:personal`);
      setPrivateDays(raw ? JSON.parse(raw) : {});
    } catch { setPrivateDays({}); }
    if (nextUid) {
      const guest = loadLocalStore(null);
      const hasGuestData = Object.keys(guest.history).length > 0 || Object.keys(guest.extras.weights).length > 0 || Object.keys(guest.extras.quests).length > 0;
      setOfferImport(hasGuestData && localStorage.getItem(`${storageKeyFor(nextUid)}:import-decision`) !== "done");
    } else setOfferImport(false);
    setUid(nextUid);
    setLoaded(true);

    if (!nextUid) return;
    void (async () => {
      try {
        const remote = await fetchStore(nextUid);
        if (auth.currentUser?.uid !== nextUid) return;
        setStore((local) => mergeStores(local, remote));
      } catch (error) {
        console.error("Error fetching data:", error);
        if (auth.currentUser?.uid !== nextUid) return;
        setSyncStatus("error");
        setSyncError(syncErrorMessage(error));
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      saveLocalStore(uid, store);
    } catch {
      // Storage may be unavailable; keep the in-memory copy for cloud sync.
    }
  }, [store, loaded, uid]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(`${storageKeyFor(uid)}:personal`, JSON.stringify(privateDays)); } catch { /* private storage unavailable */ }
  }, [privateDays, loaded, uid]);

  useEffect(() => {
    if (!loaded || !uid) return;
    const timeout = window.setTimeout(async () => {
      if (auth.currentUser?.uid !== uid) return;
      setSyncStatus("saving");
      try {
        // Reconcile state on load/manual sync, avoiding an auto-sync loop.
        await commitStore(uid, store);
        if (auth.currentUser?.uid !== uid) return;
        setSyncStatus("saved");
        setSyncError(null);
        setLastSyncedAt(Date.now());
      } catch (error) {
        console.error("Error auto-syncing:", error);
        if (auth.currentUser?.uid !== uid) return;
        setSyncStatus("error");
        setSyncError(syncErrorMessage(error));
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [store, loaded, uid]);

  const updateDay = (day: string, patch: Partial<DayEntry>) => {
    // A click can beat the midnight/visibility refresh. Never copy a stale
    // day's displayed values into a new day or mutate a different account.
    if (!loaded || todayKey !== getLocalISODate() || (auth.currentUser?.uid ?? null) !== uid) return;
    setStore((prev) => {
      const history = updateRecentDay(prev.history, day, patch);
      return history === prev.history ? prev : { ...prev, history };
    });
  };

  const updateToday = (patch: Partial<DayEntry>) => updateDay(todayKey, patch);

  const toggleQuest = (quest: QuestId, day = todayKey) => {
    if (todayKey !== getLocalISODate() || (auth.currentUser?.uid ?? null) !== uid ||
      day > todayKey || weekKey(day) !== weekKey(todayKey)) return;
    const key = `${weekKey(todayKey)}:${quest}`;
    setStore((prev) => {
      const current = prev.extras.quests[key];
      const target = quest === "footNails" ? 2 : 1;
      if (!current?.edits[day]?.done && (current?.days.length ?? 0) >= target) return prev;
      const updatedAt = Date.now();
      const edits = { ...current?.edits, [day]: { done: !(current?.edits[day]?.done ?? false), updatedAt } };
      const days = Object.keys(edits).filter((day) => edits[day].done).sort();
      return { ...prev, extras: { ...prev.extras, quests: { ...prev.extras.quests, [key]: { edits, days, updatedAt } } } };
    });
  };

  const saveWeight = (date: string, record: Omit<WeightRecord, "updatedAt">) => {
    if ((auth.currentUser?.uid ?? null) !== uid || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > getLocalISODate()) return;
    if (record.weight !== null && (!Number.isFinite(record.weight) || record.weight <= 0)) return;
    setStore((prev) => ({ ...prev, extras: { ...prev.extras, weights: {
      ...prev.extras.weights, [date]: { ...record, updatedAt: Date.now() },
    } } }));
  };

  const togglePersonalGoal = (day = todayKey) => {
    if (!loaded || todayKey !== getLocalISODate() || (auth.currentUser?.uid ?? null) !== uid ||
      !editableDayKeys().includes(day)) return;
    setPrivateDays((prev) => ({ ...prev, [day]: !prev[day] }));
  };

  const decideImport = (accept: boolean) => {
    if (!uid || auth.currentUser?.uid !== uid) return;
    if (accept) setStore((prev) => mergeStores(loadLocalStore(null), prev));
    try { localStorage.setItem(`${storageKeyFor(uid)}:import-decision`, "done"); } catch { /* retry offer next session */ }
    setOfferImport(false);
  };

  const syncData = async () => {
    if (!uid || auth.currentUser?.uid !== uid) return false;
    setSyncStatus("saving");
    try {
      const merged = await commitStore(uid, store);
      if (auth.currentUser?.uid !== uid) return false;
      // Preserve edits made while the request was in flight.
      setStore((local) => mergeStores(local, merged));
      setSyncStatus("saved");
      setSyncError(null);
      setLastSyncedAt(Date.now());
      return true;
    } catch (error) {
      console.error("Error syncing:", error);
      if (auth.currentUser?.uid !== uid) return false;
      setSyncStatus("error");
      setSyncError(syncErrorMessage(error));
      return false;
    }
  };

  return { history: store.history, extras: store.extras, privateDays, offerImport, decideImport,
    toggleQuest, saveWeight, togglePersonalGoal, loaded, updateDay, updateToday, syncData, syncStatus, syncError, lastSyncedAt, onIdentityChange };
}
