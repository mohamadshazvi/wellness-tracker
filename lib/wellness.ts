// Pure domain logic for the wellness tracker.
//
// This module deliberately has NO imports at all: no React, no Firebase, no
// theme. That keeps every function trivially unit testable (see
// lib/wellness.test.ts) and reusable by both the UI and the sync layer.
// Node's native test runner resolves modules with strict ESM rules, so a
// dependency here would need an explicit .ts extension that Next's bundler
// does not require — another reason to keep it dependency-free.

// --- Constants & Types ---
export const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export const STORAGE_KEY = "wellness-history-v4";

/**
 * localStorage key holding one session's local copy of the history. Signed-in
 * accounts get a per-uid key so two accounts on a shared device can never read
 * or overwrite each other's days; anonymous (signed-out) use keeps STORAGE_KEY.
 */
export function storageKeyFor(uid: string | null) {
  return uid ? `${STORAGE_KEY}:u:${uid}` : STORAGE_KEY;
}

export type DayEntry = {
  prayers: Record<string, boolean>;
  noDinner: boolean;
  gymDay: boolean;
  restDay: boolean;
  avoidedJunk: boolean;
  morningMed: boolean;
  nightMed: boolean;
  weight: number | null;
  /** Epoch ms of the last local edit; used to resolve day-level sync conflicts. */
  updatedAt: number;
};

export type History = Record<string, DayEntry>;

// --- Entries ---
export function emptyEntry(): DayEntry {
  return {
    prayers: Object.fromEntries(PRAYERS.map((p) => [p, false])),
    noDinner: false,
    gymDay: false,
    restDay: false,
    avoidedJunk: false,
    morningMed: false,
    nightMed: false,
    weight: null,
    updatedAt: 0,
  };
}

// --- Dates ---
export function buildDateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getLocalISODate(d: Date = new Date()) {
  return buildDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `YYYY-MM` prefix used to select every entry that belongs to a month. */
export function monthKeyPrefix(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export type MonthView = {
  year: number;
  monthIndex: number;
  label: string;
  daysInMonth: number;
  startWeekday: number;
  cells: (number | null)[];
};

/**
 * Builds the grid for a month relative to the current one. The target date is
 * anchored to day 1 so month arithmetic can never roll over and skip a month
 * when today's day-of-month exceeds the target month's length (e.g. Jan 31).
 */
export function getMonthView(
  monthOffset: number,
  now: Date = new Date(),
): MonthView {
  const viewMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewMonth.getFullYear();
  const monthIndex = viewMonth.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = new Date(year, monthIndex, 1).getDay();

  return {
    year,
    monthIndex,
    label: viewMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    daysInMonth,
    startWeekday,
    cells: [
      ...Array<number | null>(startWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ],
  };
}

// --- Scoring ---
export function scoreOf(e: DayEntry) {
  // Derived from PRAYERS so the checklist length is always 10, even when an
  // entry (legacy or remote) has a missing/partial prayers map.
  const checks = [
    ...PRAYERS.map((p) => e.prayers?.[p] ?? false),
    e.noDinner,
    e.gymDay || e.restDay,
    e.avoidedJunk,
    e.morningMed,
    e.nightMed,
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}

export function isFullDay(e: DayEntry) {
  const s = scoreOf(e);
  return s.done === s.total && s.total > 0;
}

export const PREDICATES = {
  prayer: (e: DayEntry) => PRAYERS.every((p) => e.prayers?.[p] === true),
  junk: (e: DayEntry) => e.avoidedJunk,
  fitness: (e: DayEntry) => e.gymDay || e.restDay,
  med: (e: DayEntry) => e.morningMed && e.nightMed,
  full: (e: DayEntry) => isFullDay(e),
};

export function computeStreak(history: History, predicate: (e: DayEntry) => boolean) {
  let streak = 0;
  const cursor = new Date();
  const todayEntry = history[getLocalISODate(cursor)];
  // An unfinished day does not break a streak: start counting from yesterday.
  if (!todayEntry || !predicate(todayEntry))
    cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const key = getLocalISODate(cursor);
    const entry = history[key];
    if (entry && predicate(entry)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

export function allStreaks(history: History) {
  return {
    prayer: computeStreak(history, PREDICATES.prayer),
    junk: computeStreak(history, PREDICATES.junk),
    fitness: computeStreak(history, PREDICATES.fitness),
    med: computeStreak(history, PREDICATES.med),
    full: computeStreak(history, PREDICATES.full),
  };
}

export type Streaks = ReturnType<typeof allStreaks>;

// --- Validation ---
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asBool(value: unknown) {
  return value === true;
}

function asTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Coerces one unknown value (from Firestore or localStorage) into the exact
 * DayEntry shape. Anything mistyped or missing falls back to the empty entry,
 * so scoring and streaks never receive undefined fields.
 */
export function normalizeEntry(raw: unknown): DayEntry {
  const entry = emptyEntry();
  if (!isRecord(raw)) return entry;

  const prayers = isRecord(raw.prayers) ? raw.prayers : {};
  for (const prayer of PRAYERS) {
    entry.prayers[prayer] = asBool(prayers[prayer]);
  }

  entry.noDinner = asBool(raw.noDinner);
  entry.gymDay = asBool(raw.gymDay);
  entry.restDay = asBool(raw.restDay);
  entry.avoidedJunk = asBool(raw.avoidedJunk);
  entry.morningMed = asBool(raw.morningMed);
  entry.nightMed = asBool(raw.nightMed);
  entry.weight =
    typeof raw.weight === "number" && Number.isFinite(raw.weight)
      ? raw.weight
      : null;
  entry.updatedAt = asTimestamp(raw.updatedAt);

  return entry;
}

export function isEmptyEntry(entry: DayEntry) {
  return entry.weight === null && scoreOf(entry).done === 0;
}

/**
 * Validates an untrusted history blob (Firestore document or localStorage),
 * keeping only well-formed YYYY-MM-DD keys. Entries that carry no information
 * are dropped so empty placeholder days never accumulate.
 */
export function normalizeHistory(raw: unknown): History {
  if (!isRecord(raw)) return {};

  const history: History = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!DATE_KEY_RE.test(key)) continue;
    const entry = normalizeEntry(value);
    if (!isEmptyEntry(entry)) history[key] = entry;
  }
  return history;
}

/**
 * Day-level merge: each date is taken from whichever side touched it last,
 * so a stale remote read can't roll back newer local edits and vice versa.
 * Days present on only one side are always kept. Entries with no timestamp
 * (legacy data) sort oldest, letting any timestamped copy win.
 */
export function mergeHistories(local: History, remote: History): History {
  const merged: History = { ...remote };
  for (const [key, entry] of Object.entries(local)) {
    const other = merged[key];
    if (!other || entry.updatedAt >= other.updatedAt) merged[key] = entry;
  }
  return merged;
}

// --- Auth messages ---
export function authErrorMessage(error: unknown, mode?: "signin" | "signup") {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
    return mode === "signin"
      ? "The email or password is incorrect. Try again, reset your password, or choose Create account if you are new here."
      : "Those account details could not be accepted. Check your email and try again.";
  }
  if (code === "auth/user-not-found") {
    return "No account was found for this email. Choose Create account first.";
  }
  if (code === "auth/email-already-in-use") {
    return "This email already has an account. Choose Sign in instead.";
  }
  if (code === "auth/weak-password") {
    return "Choose a password with at least 6 characters.";
  }
  if (code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }

  return "Authentication failed. Please try again.";
}

/**
 * Turns a Firestore failure into something the user can act on. Every message
 * reassures that on-device history is intact, because a failed sync is never
 * itself a data loss.
 */
export function syncErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  // Checked before the code, because a disabled API surfaces as
  // "permission-denied" too, and the specific cause is the useful one.
  if (/has not been used in project|it is disabled|not been enabled/i.test(raw)) {
    return "Cloud sync is not enabled for this project yet. Your history is safe on this device.";
  }
  if (code === "permission-denied" || /insufficient permissions/i.test(raw)) {
    return "The database rejected the sync. Your history is safe on this device.";
  }
  if (code === "unauthenticated") {
    return "Your session expired. Sign in again to resume syncing.";
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Could not reach the cloud. Check your connection and retry.";
  }
  if (code === "resource-exhausted") {
    return "Cloud sync is over its quota right now. Try again later.";
  }
  if (code === "failed-precondition") {
    return "Cloud sync is misconfigured for this project. Your history is safe on this device.";
  }
  return "Cloud sync failed. Your history is safe on this device.";
}

// --- Sync status labels ---
/**
 * Human label for when the cloud copy was last written. Anything under a
 * minute reads as "just now"; older syncs show the wall-clock time so the
 * "Saved to cloud" state can always be checked against a real timestamp.
 */
export function syncedLabel(
  lastSyncedAt: number | null,
  now: number = Date.now(),
): string {
  if (lastSyncedAt === null || lastSyncedAt <= 0) return "";
  if (now - lastSyncedAt < 60_000) return "just now";
  const time = new Date(lastSyncedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `at ${time}`;
}

// --- Achievements ---
/** Palette slot names; the UI maps these onto lib/theme COLORS. */
export type AchievementColor = "amber" | "emerald" | "indigo" | "rose";

export type Achievement = {
  id: string;
  title: string;
  desc: string;
  color: AchievementColor;
  check: (streaks: Streaks, today: DayEntry) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "perfect-day",
    title: "Perfect Day",
    desc: "Everything checked off today",
    color: "amber",
    check: (_s, t) => isFullDay(t),
  },
  {
    id: "week-prayer",
    title: "7-Day Prayers",
    desc: "All 5 prayers, 7 days straight",
    color: "emerald",
    check: (s) => s.prayer >= 7,
  },
  {
    id: "clean-week",
    title: "Clean Eating Week",
    desc: "Avoided junk food for 7 days",
    color: "indigo",
    check: (s) => s.junk >= 7,
  },
  {
    id: "fitness-fortnight",
    title: "14-Day Fitness",
    desc: "Gym or rest, on schedule for 14 days",
    color: "rose",
    check: (s) => s.fitness >= 14,
  },
  {
    id: "med-month",
    title: "30-Day Medicine",
    desc: "Never missed a dose for 30 days",
    color: "emerald",
    check: (s) => s.med >= 30,
  },
];
