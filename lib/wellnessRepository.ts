import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { mergeHistories, normalizeHistory, storageKeyFor, type History } from "./wellness";
import { emptyExtras, mergeExtras, migrateWeights, normalizeExtras, type Extras } from "./extras";

export type WellnessStore = { history: History; extras: Extras };
export const emptyStore = (): WellnessStore => ({ history: {}, extras: emptyExtras() });
export function mergeStores(local: WellnessStore, remote: WellnessStore): WellnessStore {
  const history = mergeHistories(local.history, remote.history);
  return { history, extras: migrateWeights(mergeExtras(local.extras, remote.extras), history) };
}

function loadLocalHistory(uid: string | null): History {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKeyFor(uid));
    return raw ? normalizeHistory(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function saveLocalHistory(uid: string | null, history: History) {
  window.localStorage.setItem(storageKeyFor(uid), JSON.stringify(history));
}

export function loadLocalStore(uid: string | null): WellnessStore {
  const history = loadLocalHistory(uid);
  let extras = emptyExtras();
  try {
    const raw = localStorage.getItem(`${storageKeyFor(uid)}:extras`);
    if (raw) extras = normalizeExtras(JSON.parse(raw));
  } catch { /* local storage disabled */ }
  return { history, extras: migrateWeights(extras, history) };
}

export function saveLocalStore(uid: string | null, store: WellnessStore) {
  saveLocalHistory(uid, store.history);
  localStorage.setItem(`${storageKeyFor(uid)}:extras`, JSON.stringify(store.extras));
}

export async function fetchStore(uid: string): Promise<WellnessStore> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return emptyStore();
  const data = snapshot.data();
  const history = normalizeHistory(data.history);
  return { history, extras: migrateWeights(normalizeExtras(data.extras), history) };
}

export async function commitStore(uid: string, local: WellnessStore): Promise<WellnessStore> {
  const ref = doc(db, "users", uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.exists() ? snapshot.data() : {};
    const remoteHistory = normalizeHistory(data.history);
    const remote = { history: remoteHistory, extras: migrateWeights(normalizeExtras(data.extras), remoteHistory) };
    const merged = mergeStores(local, remote);
    transaction.set(ref, merged, { merge: true });
    return merged;
  });
}
