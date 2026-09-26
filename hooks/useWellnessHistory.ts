"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import {
  emptyEntry,
  getLocalISODate,
  mergeHistories,
  syncErrorMessage,
  type DayEntry,
  type History,
} from "../lib/wellness";
import {
  commitHistory,
  fetchHistory,
  loadLocalHistory,
  saveLocalHistory,
} from "../lib/wellnessRepository";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export function useWellnessHistory(todayKey: string) {
  const [history, setHistory] = useState<History>({});
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
    setHistory(loadLocalHistory(nextUid));
    setUid(nextUid);
    setLoaded(true);

    if (!nextUid) return;
    void (async () => {
      try {
        const remote = await fetchHistory(nextUid);
        if (auth.currentUser?.uid !== nextUid) return;
        if (Object.keys(remote).length > 0) {
          setHistory((local) => mergeHistories(local, remote));
        }
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
      saveLocalHistory(uid, history);
    } catch {
      // Storage may be unavailable; keep the in-memory copy for cloud sync.
    }
  }, [history, loaded, uid]);

  useEffect(() => {
    if (!loaded || !uid) return;
    const timeout = window.setTimeout(async () => {
      if (auth.currentUser?.uid !== uid) return;
      setSyncStatus("saving");
      try {
        // Reconcile state on load/manual sync, avoiding an auto-sync loop.
        await commitHistory(uid, history);
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
  }, [history, loaded, uid]);

  const updateToday = (patch: Partial<DayEntry>) => {
    // A click can beat the midnight/visibility refresh. Never copy a stale
    // day's displayed values into a new day or mutate a different account.
    if (todayKey !== getLocalISODate() || (auth.currentUser?.uid ?? null) !== uid) return;
    setHistory((prev) => ({
      ...prev,
      [todayKey]: { ...(prev[todayKey] ?? emptyEntry()), ...patch, updatedAt: Date.now() },
    }));
  };

  const syncData = async () => {
    if (!uid || auth.currentUser?.uid !== uid) return false;
    setSyncStatus("saving");
    try {
      const merged = await commitHistory(uid, history);
      if (auth.currentUser?.uid !== uid) return false;
      // Preserve edits made while the request was in flight.
      setHistory((local) => mergeHistories(local, merged));
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

  return { history, loaded, updateToday, syncData, syncStatus, syncError, lastSyncedAt, onIdentityChange };
}
