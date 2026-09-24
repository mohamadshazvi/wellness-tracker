"use client";

import { auth, db } from "../lib/firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  authErrorMessage,
  emptyEntry,
  getLocalISODate,
  mergeHistories,
  normalizeHistory,
  storageKeyFor,
  syncErrorMessage,
  type DayEntry,
  type History,
} from "../lib/wellness";

export type WellnessUser = { email: string; uid: string };
export type SyncStatus = "idle" | "saving" | "saved" | "error";

/** Reads this identity's local copy of the history from localStorage. */
function loadLocalHistory(uid: string | null): History {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(storageKeyFor(uid));
    return raw ? normalizeHistory(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/**
 * Reconciles this device's history with the cloud inside a transaction and
 * writes the merged result. Because the merged map already contains every
 * remote day, writing it cannot drop days created by another device.
 *
 * Note: `setDoc(..., {merge: true})` cannot merge per day — its docs are
 * written with the raw key, so a dotted "history.<date>" key would become a
 * literal top-level field. Only `updateDoc` expands dotted paths, and it
 * throws on a missing document, hence the read-merge-write transaction.
 * Returns the merged history.
 */
async function commitHistory(uid: string, local: History) {
  const ref = doc(db, "users", uid);
  let merged: History = local;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const remote = snapshot.exists()
      ? normalizeHistory(snapshot.data()?.history)
      : {};
    merged = mergeHistories(local, remote);
    transaction.set(ref, { history: merged }, { merge: true });
  });

  return merged;
}

export function useWellnessData() {
  const [history, setHistory] = useState<History>({});
  const [uid, setUid] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<WellnessUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const nextUid = firebaseUser?.uid ?? null;
      const nextUser = firebaseUser
        ? { email: firebaseUser.email || "", uid: firebaseUser.uid }
        : null;

      // Every identity change swaps in that identity's own local copy, so a
      // second account on a shared device can never read or overwrite the
      // first one's days (state and storage key move together).
      setAuthError(null);
      setSyncError(null);
      setSyncStatus("idle");
      setLastSyncedAt(null);
      setHistory(loadLocalHistory(nextUid));
      setUid(nextUid);
      setUser(nextUser);
      setLoaded(true);

      if (!nextUid) return; // Signed out: local-only mode.

      void (async () => {
        try {
          const docRef = doc(db, "users", nextUid);
          const docSnap = await getDoc(docRef);
          // The user may have signed out or switched accounts while the read
          // was in flight; drop the result instead of mixing histories.
          if (auth.currentUser?.uid !== nextUid) return;
          if (!docSnap.exists()) return;
          const remote = normalizeHistory(docSnap.data()?.history);
          // Merge into the latest local state (functional update) so edits
          // made while this fetch was in flight are not discarded.
          if (Object.keys(remote).length > 0) {
            setHistory((local) => mergeHistories(local, remote));
          }
        } catch (e) {
          console.error("Error fetching data:", e);
          if (auth.currentUser?.uid !== nextUid) return;
          setSyncStatus("error");
          setSyncError(syncErrorMessage(e));
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  // Persist to the key belonging to the identity that owns this history.
  // history and uid are always set together, so they cannot disagree here.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKeyFor(uid), JSON.stringify(history));
    } catch {
      // Storage full or unavailable (e.g. private mode): keep the in-memory
      // copy and let the cloud sync be the durable backup.
    }
  }, [history, loaded, uid]);

  useEffect(() => {
    if (!loaded || !user) return;

    const timeout = window.setTimeout(async () => {
      // Auth may have changed while the debounce was pending.
      if (auth.currentUser?.uid !== user.uid) return;

      setSyncStatus("saving");
      try {
        // Note: deliberately no setHistory here. Writing a merged result back
        // into state would re-trigger this effect; local state is reconciled
        // on load and on explicit sync instead.
        await commitHistory(user.uid, history);
        if (auth.currentUser?.uid !== user.uid) return;
        setSyncStatus("saved");
        setSyncError(null);
        setLastSyncedAt(Date.now());
      } catch (e) {
        console.error("Error auto-syncing:", e);
        if (auth.currentUser?.uid !== user.uid) return;
        setSyncStatus("error");
        setSyncError(syncErrorMessage(e));
      }
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [history, loaded, user]);

  const updateToday = (patch: Partial<DayEntry>) => {
    setHistory((prev) => {
      const key = getLocalISODate();
      const current = prev[key] ?? emptyEntry();
      return {
        ...prev,
        [key]: { ...current, ...patch, updatedAt: Date.now() },
      };
    });
  };

  const login = async (
    email: string,
    password: string,
    mode: "signin" | "signup",
  ) => {
    setAuthError(null);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: unknown) {
      // Success clears itself via the auth-state listener.
      setAuthError(authErrorMessage(error, mode));
    }
  };

  const loginWithProvider = async (
    providerName: "google" | "facebook" | "apple",
  ) => {
    setAuthError(null);
    const provider =
      providerName === "google"
        ? new GoogleAuthProvider()
        : providerName === "facebook"
          ? new FacebookAuthProvider()
          : new OAuthProvider("apple.com");

    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error));
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) {
      setAuthError("Enter your email address first.");
      return false;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setAuthError(null);
      return true;
    } catch (error: unknown) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not send the reset email.",
      );
      return false;
    }
  };

  const logout = () => {
    signOut(auth);
  };

  const syncData = async () => {
    if (!user) return false;

    setSyncStatus("saving");
    try {
      const merged = await commitHistory(user.uid, history);
      // Signed out or switched accounts mid-sync: discard the result rather
      // than pouring this account's data into the next identity's state.
      if (auth.currentUser?.uid !== user.uid) return false;
      // Merge rather than overwrite so edits made while syncing survive.
      setHistory((local) => mergeHistories(local, merged));
      setSyncStatus("saved");
      setSyncError(null);
      setLastSyncedAt(Date.now());
      return true;
    } catch (e) {
      console.error("Error syncing:", e);
      if (auth.currentUser?.uid !== user.uid) return false;
      setSyncStatus("error");
      setSyncError(syncErrorMessage(e));
      return false;
    }
  };

  return {
    history,
    loaded,
    updateToday,
    todayKey: getLocalISODate(),
    user,
    authError,
    login,
    loginWithProvider,
    resetPassword,
    logout,
    syncData,
    syncStatus,
    syncError,
    lastSyncedAt,
  };
}

export type WellnessData = ReturnType<typeof useWellnessData>;
