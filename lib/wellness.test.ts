import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENTS,
  PRAYERS,
  allStreaks,
  computeStreak,
  emptyEntry,
  getLocalISODate,
  getMonthView,
  isFullDay,
  mergeHistories,
  normalizeEntry,
  normalizeHistory,
  scoreOf,
  storageKeyFor,
  syncedLabel,
  syncErrorMessage,
  PREDICATES,
  type DayEntry,
  type History,
} from "./wellness.ts";

// --- Helpers ---
function entry(partial: Partial<DayEntry> = {}): DayEntry {
  return { ...emptyEntry(), ...partial };
}

/** A complete day: all prayers, both supplements, activity and clean eating. */
function perfectEntry(partial: Partial<DayEntry> = {}): DayEntry {
  return entry({
    prayers: Object.fromEntries(PRAYERS.map((p) => [p, true])),
    noDinner: true,
    gymDay: true,
    avoidedJunk: true,
    morningMed: true,
    nightMed: true,
    ...partial,
  });
}

/** Local date key for N days ago, so tests never depend on the wall clock. */
function keyDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return getLocalISODate(d);
}

/** History containing an entry for each given "days ago" offset. */
function historyOf(
  offsets: number[],
  partial: Partial<DayEntry> = {},
): History {
  const history: History = {};
  for (const offset of offsets) history[keyDaysAgo(offset)] = entry(partial);
  return history;
}

// --- scoreOf ---
describe("cleared-entry sync", () => {
  test("keeps an offline clear after reload when merging an older cloud entry", () => {
    const key = "2026-09-26";
    const cleared = entry({ updatedAt: 200 });
    const reloaded = normalizeHistory(JSON.parse(JSON.stringify({ [key]: cleared })));
    const remote = normalizeHistory({ [key]: entry({ morningMed: true, updatedAt: 100 }) });
    assert.deepEqual(mergeHistories(reloaded, remote)[key], cleared);
  });

  test("keeps a cloud clear when an older device syncs its checked entry", () => {
    const key = "2026-09-26";
    const cleared = entry({ updatedAt: 200 });
    const remote = normalizeHistory({ [key]: cleared });
    const local = { [key]: entry({ weight: 80, updatedAt: 100 }) };
    assert.deepEqual(mergeHistories(local, remote)[key], cleared);
  });
});

describe("scoreOf", () => {
  test("counts 0 of 10 for an empty day", () => {
    assert.deepEqual(scoreOf(emptyEntry()), { done: 0, total: 10 });
  });

  test("always has a total of 10, whatever the prayers map looks like", () => {
    assert.equal(scoreOf(entry({ prayers: {} })).total, 10);
    assert.equal(scoreOf(entry({ prayers: { Fajr: true } })).total, 10);
    // Legacy/remote entry with the field missing entirely.
    assert.equal(scoreOf({ prayers: {} } as unknown as DayEntry).total, 10);
    assert.equal(scoreOf({} as unknown as DayEntry).total, 10);
  });

  test("counts each of the 5 prayers", () => {
    assert.equal(scoreOf(entry({ prayers: { Fajr: true } })).done, 1);
    assert.equal(
      scoreOf(entry({ prayers: { Fajr: true, Dhuhr: true, Asr: true } })).done,
      3,
    );
    assert.equal(
      scoreOf(entry({ prayers: Object.fromEntries(PRAYERS.map((p) => [p, true])) }))
        .done,
      5,
    );
  });

  test("ignores prayer keys that are not real prayers", () => {
    assert.equal(scoreOf(entry({ prayers: { Nope: true } })).done, 0);
  });

  test("counts gym-or-rest as a single habit, never both", () => {
    assert.equal(scoreOf(entry({ gymDay: true })).done, 1);
    assert.equal(scoreOf(entry({ restDay: true })).done, 1);
    assert.equal(scoreOf(entry({ gymDay: true, restDay: true })).done, 1);
  });

  test("does not score body weight", () => {
    assert.equal(scoreOf(entry({ weight: 82.5 })).done, 0);
  });

  test("scores a perfect day as 10 of 10", () => {
    assert.deepEqual(scoreOf(perfectEntry()), { done: 10, total: 10 });
  });
});

// --- isFullDay ---
describe("isFullDay", () => {
  test("is true only for a complete day", () => {
    assert.equal(isFullDay(perfectEntry()), true);
  });

  test("is false for an empty day", () => {
    assert.equal(isFullDay(emptyEntry()), false);
  });

  test("is false when every non-prayer habit is done but prayers are missing", () => {
    // Regression: the checklist used to be built from Object.values(prayers),
    // so a missing prayers map shortened it and scored 5/5 = "perfect".
    const noPrayers = entry({
      prayers: {},
      noDinner: true,
      gymDay: true,
      avoidedJunk: true,
      morningMed: true,
      nightMed: true,
    });
    assert.deepEqual(scoreOf(noPrayers), { done: 5, total: 10 });
    assert.equal(isFullDay(noPrayers), false);
  });

  test("is false when a single prayer is missed", () => {
    const almost = perfectEntry({
      prayers: { ...perfectEntry().prayers, Isha: false },
    });
    assert.equal(isFullDay(almost), false);
  });
});

// --- computeStreak / allStreaks ---
describe("computeStreak", () => {
  test("counts consecutive days ending today", () => {
    const history = historyOf([0, 1, 2], { avoidedJunk: true });
    assert.equal(computeStreak(history, PREDICATES.junk), 3);
  });

  test("counts a single qualifying day as 1", () => {
    assert.equal(computeStreak(historyOf([0], { avoidedJunk: true }), PREDICATES.junk), 1);
  });

  test("returns 0 for empty history", () => {
    assert.equal(computeStreak({}, PREDICATES.junk), 0);
  });

  test("keeps yesterday's streak while today is still unfinished", () => {
    const history = historyOf([1, 2], { avoidedJunk: true });
    assert.equal(computeStreak(history, PREDICATES.junk), 2);
  });

  test("treats an explicitly empty today as unfinished, not as a break", () => {
    const history = historyOf([1, 2], { avoidedJunk: true });
    history[keyDaysAgo(0)] = emptyEntry();
    assert.equal(computeStreak(history, PREDICATES.junk), 2);
  });

  test("stops at the first gap", () => {
    // Today, yesterday, then a missing day, then an older qualifying day.
    assert.equal(
      computeStreak(historyOf([0, 1, 3], { avoidedJunk: true }), PREDICATES.junk),
      2,
    );
  });

  test("stops at a day that fails the predicate", () => {
    const history = historyOf([0, 1], { avoidedJunk: true });
    history[keyDaysAgo(2)] = entry({ avoidedJunk: false });
    history[keyDaysAgo(3)] = entry({ avoidedJunk: true });
    assert.equal(computeStreak(history, PREDICATES.junk), 2);
  });

  test("does not let a day with no data continue a streak", () => {
    const history: History = {};
    history[keyDaysAgo(0)] = entry({ avoidedJunk: true });
    // day 1 absent
    history[keyDaysAgo(2)] = entry({ avoidedJunk: true });
    assert.equal(computeStreak(history, PREDICATES.junk), 1);
  });

  test("a streak that must cross a month boundary still counts", () => {
    const offsets = Array.from({ length: 40 }, (_, i) => i);
    const history = historyOf(offsets, { avoidedJunk: true });
    assert.equal(computeStreak(history, PREDICATES.junk), 40);
  });

  test("prayer streak requires all five prayers that day", () => {
    const fourPrayers = entry({
      prayers: { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: false },
    });
    const history: History = {
      [keyDaysAgo(0)]: fourPrayers,
      [keyDaysAgo(1)]: perfectEntry(),
    };
    // Today fails, so counting starts at yesterday; the gap at today ends it.
    assert.equal(computeStreak(history, PREDICATES.prayer), 1);

    const allFive = perfectEntry();
    assert.equal(
      computeStreak(
        { [keyDaysAgo(0)]: allFive, [keyDaysAgo(1)]: perfectEntry() },
        PREDICATES.prayer,
      ),
      2,
    );
  });

  test("a partial prayers map never counts toward the prayer streak", () => {
    // Regression: {}.every(Boolean) is true, so a missing prayers map used to
    // satisfy the prayer predicate vacuously.
    const history: History = {
      [keyDaysAgo(0)]: { prayers: {} } as unknown as DayEntry,
    };
    assert.equal(computeStreak(history, PREDICATES.prayer), 0);
  });

  test("medicine streak needs both morning and night", () => {
    const onlyMorning = historyOf([0, 1], { morningMed: true });
    assert.equal(computeStreak(onlyMorning, PREDICATES.med), 0);

    const both = historyOf([0, 1], { morningMed: true, nightMed: true });
    assert.equal(computeStreak(both, PREDICATES.med), 2);
  });

  test("full-day streak tracks perfect days", () => {
    const history: History = {
      [keyDaysAgo(0)]: perfectEntry(),
      [keyDaysAgo(1)]: perfectEntry(),
    };
    assert.equal(computeStreak(history, PREDICATES.full), 2);
  });
});

describe("allStreaks", () => {
  test("reports every streak for the same history", () => {
    const history: History = {
      [keyDaysAgo(0)]: perfectEntry(),
      [keyDaysAgo(1)]: perfectEntry(),
      [keyDaysAgo(2)]: perfectEntry({ avoidedJunk: false, gymDay: false, restDay: true }),
    };
    const streaks = allStreaks(history);

    assert.equal(streaks.prayer, 3);
    assert.equal(streaks.fitness, 3); // gym for two days, rest for the third
    assert.equal(streaks.junk, 2); // day 3 broke it
    assert.equal(streaks.med, 3);
    assert.equal(streaks.full, 2); // day 3 was not perfect
  });
});

// --- Achievements depend on the streaks above ---
describe("achievements", () => {
  test("unlock thresholds line up with streak lengths", () => {
    const sevenDays = historyOf(
      Array.from({ length: 7 }, (_, i) => i),
      { avoidedJunk: true },
    );
    const streaks = allStreaks(sevenDays);
    const unlocked = ACHIEVEMENTS.filter((a) =>
      a.check(streaks, sevenDays[keyDaysAgo(0)]),
    ).map((a) => a.id);

    assert.deepEqual(unlocked, ["clean-week"]);
  });
});

// --- Validation ---
describe("normalizeHistory", () => {
  test("drops keys that are not YYYY-MM-DD dates", () => {
    const history = normalizeHistory({
      "2026-09-01": { avoidedJunk: true },
      "not-a-date": { avoidedJunk: true },
      "2026-9-3": { avoidedJunk: true },
      "2026-09-01T10:00:00Z": { avoidedJunk: true },
    });
    assert.deepEqual(Object.keys(history), ["2026-09-01"]);
  });

  test("returns {} for non-object input", () => {
    for (const raw of [null, undefined, 42, "hello", [1, 2], true]) {
      assert.deepEqual(normalizeHistory(raw), {});
    }
  });

  test("coerces a valid entry into the exact shape", () => {
    const history = normalizeHistory({
      "2026-09-01": {
        prayers: { Fajr: true, Isha: true, Bogus: true },
        avoidedJunk: true,
        weight: 70.5,
        updatedAt: 500,
      },
    });
    const day = history["2026-09-01"];

    assert.deepEqual(Object.keys(day.prayers).sort(), [...PRAYERS].sort());
    assert.equal(day.prayers.Fajr, true);
    assert.equal(day.prayers.Isha, true);
    assert.equal("Bogus" in day.prayers, false);
    assert.equal(day.prayers.Dhuhr, false);
    assert.equal(day.avoidedJunk, true);
    assert.equal(day.weight, 70.5);
    assert.equal(day.updatedAt, 500);
  });

  test("drops days that carry no information", () => {
    assert.deepEqual(normalizeHistory({ "2026-09-02": { prayers: {} } }), {});
    assert.deepEqual(normalizeHistory({ "2026-09-02": {} }), {});
    // A weight-only day is still information.
    assert.deepEqual(Object.keys(normalizeHistory({ "2026-09-02": { weight: 0 } })), [
      "2026-09-02",
    ]);
  });
});

describe("normalizeEntry", () => {
  test("coerces mistyped fields to safe defaults", () => {
    const day = normalizeEntry({
      prayers: "nonsense",
      noDinner: "yes",
      gymDay: 1,
      restDay: null,
      avoidedJunk: {},
      weight: "80",
      updatedAt: "soon",
    });

    assert.equal(day.noDinner, false);
    assert.equal(day.gymDay, false);
    assert.equal(day.restDay, false);
    assert.equal(day.avoidedJunk, false);
    assert.equal(day.weight, null);
    assert.equal(day.updatedAt, 0);
    assert.deepEqual(Object.keys(day.prayers).sort(), [...PRAYERS].sort());
  });

  test("returns an empty entry for non-object input", () => {
    assert.deepEqual(normalizeEntry(null), emptyEntry());
    assert.deepEqual(normalizeEntry("x"), emptyEntry());
    assert.deepEqual(normalizeEntry([]), emptyEntry());
  });

  test("keeps a negative and a zero weight, which are finite numbers", () => {
    assert.equal(normalizeEntry({ weight: 0 }).weight, 0);
    assert.equal(normalizeEntry({ weight: -3 }).weight, -3);
    assert.equal(normalizeEntry({ weight: NaN }).weight, null);
    assert.equal(normalizeEntry({ weight: Infinity }).weight, null);
  });
});

// --- Sync error messages ---
describe("syncErrorMessage", () => {
  test("explains a disabled API even though it reports as permission-denied", () => {
    const err = Object.assign(new Error(
      "Cloud Firestore API has not been used in project wellness-tracker-bb385 before or it is disabled.",
    ), { code: "permission-denied" });

    const message = syncErrorMessage(err);
    assert.match(message, /not enabled for this project/);
    assert.match(message, /safe on this device/);
  });

  test("explains a rules rejection", () => {
    const message = syncErrorMessage({ code: "permission-denied" });
    assert.match(message, /rejected/);
    assert.match(message, /safe on this device/);
  });

  test("tells the user to sign in again when the session expired", () => {
    assert.match(syncErrorMessage({ code: "unauthenticated" }), /Sign in again/);
  });

  test("blames the connection when the cloud is unreachable", () => {
    assert.match(syncErrorMessage({ code: "unavailable" }), /connection/);
    assert.match(syncErrorMessage({ code: "deadline-exceeded" }), /connection/);
  });

  test("handles quota and misconfiguration", () => {
    assert.match(syncErrorMessage({ code: "resource-exhausted" }), /quota/);
    assert.match(syncErrorMessage({ code: "failed-precondition" }), /misconfigured/);
  });

  test("always reassures that local history survived, whatever the input", () => {
    const inputs: unknown[] = [
      null,
      undefined,
      "boom",
      42,
      {},
      new Error("plain failure"),
      { code: "internal" },
      { code: 500 },
    ];
    for (const input of inputs) {
      const message = syncErrorMessage(input);
      assert.equal(typeof message, "string");
      assert.ok(message.length > 0);
      assert.match(message, /safe on this device/);
    }
  });
});

// --- Merge ---
describe("mergeHistories", () => {
  test("takes the more recently edited copy of a shared day", () => {
    const local = { "2026-09-01": entry({ avoidedJunk: true, updatedAt: 100 }) };
    const remote = { "2026-09-01": entry({ nightMed: true, updatedAt: 200 }) };

    const merged = mergeHistories(local, remote);
    assert.equal(merged["2026-09-01"].nightMed, true);
    assert.equal(merged["2026-09-01"].avoidedJunk, false);
  });

  test("keeps newer local edits over a stale remote copy", () => {
    const local = { "2026-09-02": entry({ gymDay: true, updatedAt: 900 }) };
    const remote = { "2026-09-02": entry({ gymDay: false, updatedAt: 100 }) };

    assert.equal(mergeHistories(local, remote)["2026-09-02"].gymDay, true);
  });

  test("keeps days that exist on only one side", () => {
    const local = { "2026-09-01": entry({ updatedAt: 1 }) };
    const remote = { "2026-09-03": entry({ morningMed: true, updatedAt: 1 }) };

    const merged = mergeHistories(local, remote);
    assert.deepEqual(Object.keys(merged).sort(), [
      "2026-09-01",
      "2026-09-03",
    ]);
  });

  test("prefers a timestamped copy over legacy data with no timestamp", () => {
    const local = { "2026-09-04": entry({ weight: 60 }) }; // updatedAt 0
    const remote = { "2026-09-04": entry({ weight: 90, updatedAt: 5 }) };

    assert.equal(mergeHistories(local, remote)["2026-09-04"].weight, 90);
  });

  test("breaks a tie in favour of the local copy", () => {
    const local = { "2026-09-05": entry({ weight: 61, updatedAt: 7 }) };
    const remote = { "2026-09-05": entry({ weight: 99, updatedAt: 7 }) };

    assert.equal(mergeHistories(local, remote)["2026-09-05"].weight, 61);
  });

  test("does not mutate its inputs", () => {
    const local = { "2026-09-01": entry({ updatedAt: 5 }) };
    const remote = {
      "2026-09-01": entry({ updatedAt: 9 }),
      "2026-09-02": entry({ updatedAt: 1 }),
    };

    mergeHistories(local, remote);
    assert.deepEqual(Object.keys(local), ["2026-09-01"]);
    assert.deepEqual(Object.keys(remote).sort(), ["2026-09-01", "2026-09-02"]);
    assert.equal(remote["2026-09-01"].updatedAt, 9);
  });
});

// --- Month grid ---
describe("getMonthView", () => {
  test("does not skip a month when today is a month-end day", () => {
    // Regression: setMonth() rolled Jan 31 over into March, skipping February.
    const jan31 = new Date(2026, 0, 31);

    assert.equal(getMonthView(0, jan31).label, "January 2026");
    assert.equal(getMonthView(1, jan31).label, "February 2026");
    assert.equal(getMonthView(2, jan31).label, "March 2026");
    assert.equal(getMonthView(3, jan31).label, "April 2026");
    assert.equal(getMonthView(-1, jan31).label, "December 2025");
  });

  test("lays out the days of the month after the leading blanks", () => {
    const view = getMonthView(0, new Date(2026, 0, 31)); // Jan 2026
    assert.equal(view.daysInMonth, 31);
    assert.equal(view.startWeekday, 4); // 1 Jan 2026 is a Thursday
    assert.equal(view.cells.length, 4 + 31);
    assert.deepEqual(view.cells.slice(0, 4), [null, null, null, null]);
    assert.equal(view.cells[4], 1);
    assert.equal(view.cells[view.cells.length - 1], 31);
  });

  test("handles a leap February", () => {
    const view = getMonthView(1, new Date(2028, 0, 31));
    assert.equal(view.label, "February 2028");
    assert.equal(view.daysInMonth, 29);
  });

  test("handles year rollover in both directions", () => {
    const dec31 = new Date(2026, 11, 31);
    assert.equal(getMonthView(1, dec31).label, "January 2027");
    assert.equal(getMonthView(0, new Date(2026, 0, 15)).label, "January 2026");
    assert.equal(
      getMonthView(-1, new Date(2026, 0, 15)).label,
      "December 2025",
    );
  });
});

// --- Storage keys ---
describe("storageKeyFor", () => {
  test("namespaces per account and keeps the anonymous key stable", () => {
    assert.equal(storageKeyFor(null), "wellness-history-v4");
    assert.equal(storageKeyFor("abc123"), "wellness-history-v4:u:abc123");
  });
});

// --- Sync status labels ---
describe("syncedLabel", () => {
  test("reads as just now within the first minute", () => {
    assert.equal(syncedLabel(1_000, 60_999), "just now");
  });

  test("shows the wall-clock time for older syncs", () => {
    // en-US 24-hour formatting keeps this deterministic across locales.
    const afternoon = new Date(2026, 8, 23, 14, 32).getTime();
    assert.match(syncedLabel(afternoon, afternoon + 61_000), /^at \d{2}:\d{2}$/);
  });

  test("is empty when the history has never been synced", () => {
    assert.equal(syncedLabel(null, Date.now()), "");
    assert.equal(syncedLabel(0, Date.now()), "");
  });
});
