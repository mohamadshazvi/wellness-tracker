import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { emptyExtras, mergeExtras, migrateWeights, normalizeExtras, weekKey, weightSummary } from "./extras.ts";
import { emptyEntry, normalizeHistory, perfectDaySummary, scoreOf } from "./wellness.ts";

describe("Monday–Sunday quests", () => {
  test("rolls into the correct week across year boundaries", () => {
    assert.equal(weekKey("2027-01-03"), "2026-12-28");
    assert.equal(weekKey("2027-01-04"), "2027-01-04");
  });
  test("rejects foot-nail completions from the wrong week and duplicate days", () => {
    const extras = normalizeExtras({ quests: { "2026-09-21:footNails": {
      days: ["2026-09-21", "2026-09-21", "2026-09-25", "2026-09-28"], updatedAt: 4,
    } } });
    assert.deepEqual(extras.quests["2026-09-21:footNails"].days, ["2026-09-21", "2026-09-25"]);
  });
  test("keeps an explicit reset over an older completion", () => {
    const local = normalizeExtras({ quests: { "2026-09-21:laundry": { days: ["2026-09-26"], updatedAt: 1 } } });
    const remote = normalizeExtras({ quests: { "2026-09-21:laundry": { days: [], updatedAt: 2 } } });
    assert.deepEqual(mergeExtras(local, remote).quests["2026-09-21:laundry"].days, []);
  });
  test("merges completions on separate offline days without losing either", () => {
    const monday = normalizeExtras({ quests: { "2026-09-21:footNails": { edits: { "2026-09-21": { done: true, updatedAt: 10 } }, updatedAt: 10 } } });
    const friday = normalizeExtras({ quests: { "2026-09-21:footNails": { edits: { "2026-09-25": { done: true, updatedAt: 20 } }, updatedAt: 20 } } });
    assert.deepEqual(mergeExtras(monday, friday).quests["2026-09-21:footNails"].days, ["2026-09-21", "2026-09-25"]);
  });
  test("a later uncheck of one day does not remove another device's day", () => {
    const local = normalizeExtras({ quests: { "2026-09-21:footNails": { edits: { "2026-09-21": { done: false, updatedAt: 30 } }, updatedAt: 30 } } });
    const remote = normalizeExtras({ quests: { "2026-09-21:footNails": { edits: { "2026-09-21": { done: true, updatedAt: 10 }, "2026-09-25": { done: true, updatedAt: 20 } }, updatedAt: 20 } } });
    assert.deepEqual(mergeExtras(local, remote).quests["2026-09-21:footNails"].days, ["2026-09-25"]);
  });
});

describe("weight migration and calculations", () => {
  test("migrates legacy weight once and respects a deleted weight", () => {
    const history = normalizeHistory({ "2026-09-25": { weight: 80, updatedAt: 1 } });
    const first = migrateWeights(emptyExtras(), history);
    assert.equal(first.weights["2026-09-25"].weight, 80);
    first.weights["2026-09-25"] = { weight: null, note: "", milestone: "", updatedAt: 2 };
    assert.equal(migrateWeights(first, history).weights["2026-09-25"].weight, null);
  });
  test("calculates change and ignores deletions", () => {
    const weights = normalizeExtras({ weights: {
      "2026-09-01": { weight: 80, updatedAt: 1 },
      "2026-09-04": { weight: null, updatedAt: 3 },
      "2026-09-08": { weight: 76, milestone: "Started Gym", updatedAt: 2 },
    } }).weights;
    assert.deepEqual(weightSummary(weights).change, -4);
    assert.deepEqual(weightSummary(weights).lowest, 76);
  });
});

test("voluntary prayers are retained but never change the core daily score", () => {
  const entry = emptyEntry();
  entry.voluntaryPrayers.Tahajjud = true;
  entry.voluntaryPrayers.Duha = true;
  assert.equal(scoreOf(entry).done, 0);
  assert.equal(normalizeHistory({ "2026-09-25": entry })["2026-09-25"].voluntaryPrayers.Duha, true);
});

test("profile summary includes historical perfect-day streaks", () => {
  const day = emptyEntry();
  for (const prayer of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]) day.prayers[prayer] = true;
  Object.assign(day, { noDinner: true, gymDay: true, avoidedJunk: true, morningMed: true, nightMed: true });
  assert.deepEqual(perfectDaySummary({ "2026-09-01": day, "2026-09-02": day, "2026-09-05": day }), { total: 3, longest: 2 });
});
