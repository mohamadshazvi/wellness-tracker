import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { mergeHistories, normalizeHistory, storageKeyFor, type History } from "./wellness";

export function loadLocalHistory(uid: string | null): History {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKeyFor(uid));
    return raw ? normalizeHistory(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveLocalHistory(uid: string | null, history: History) {
  window.localStorage.setItem(storageKeyFor(uid), JSON.stringify(history));
}

export async function fetchHistory(uid: string): Promise<History> {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? normalizeHistory(snapshot.data()?.history) : {};
}

/** Read/merge/write atomically so concurrent devices cannot drop remote days. */
export async function commitHistory(uid: string, local: History): Promise<History> {
  const ref = doc(db, "users", uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const remote = snapshot.exists()
      ? normalizeHistory(snapshot.data()?.history)
      : {};
    const merged = mergeHistories(local, remote);
    transaction.set(ref, { history: merged }, { merge: true });
    return merged;
  });
}
