import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { editableDayKeys, emptyEntry, mergeHistories, normalizeHistory, scoreOf, updateRecentDay } from "./wellness.ts";

describe("recent daily activity editing", () => {
  test("offers today and exactly two previous dates", () => {
    assert.deepEqual(editableDayKeys("2026-10-07"), ["2026-10-07", "2026-10-06", "2026-10-05"]);
  });

  test("crosses months, years, and leap days", () => {
    assert.deepEqual(editableDayKeys("2026-01-01"), ["2026-01-01", "2025-12-31", "2025-12-30"]);
    assert.deepEqual(editableDayKeys("2028-03-01"), ["2028-03-01", "2028-02-29", "2028-02-28"]);
  });

  test("uses calendar arithmetic across daylight-saving transitions", () => {
    assert.deepEqual(editableDayKeys("2026-03-09"), ["2026-03-09", "2026-03-08", "2026-03-07"]);
    assert.deepEqual(editableDayKeys("2026-11-02"), ["2026-11-02", "2026-11-01", "2026-10-31"]);
  });

  test("rejects invalid anchors", () => {
    assert.deepEqual(editableDayKeys("not-a-date"), []);
    assert.deepEqual(editableDayKeys("2026-02-30"), []);
  });

  const now = new Date("2026-10-07T12:00:00");
  for (const day of ["2026-10-07", "2026-10-06", "2026-10-05"]) {
    test(`creates a missed entry for ${day}`, () => {
      const history = updateRecentDay({}, day, { morningMed: true }, now);
      assert.equal(history[day].morningMed, true);
      assert.equal(history[day].updatedAt, now.getTime());
      assert.equal(scoreOf(history[day]).done, 1);
    });
  }

  test("preserves unrelated fields and other days without mutating history", () => {
    const history = { "2026-10-07": emptyEntry(), "2026-10-06": { ...emptyEntry(), gymDay: true, weight: 80 } };
    const updated = updateRecentDay(history, "2026-10-06", { morningMed: true }, now);
    assert.equal(updated["2026-10-07"], history["2026-10-07"]);
    assert.equal(updated["2026-10-06"].gymDay, true);
    assert.equal(updated["2026-10-06"].weight, 80);
    assert.equal(history["2026-10-06"].morningMed, false);
  });

  test("rejects older, future, and malformed dates", () => {
    const history = {};
    for (const day of ["2026-10-04", "2026-10-08", "2026-13-01", "invalid"]) {
      assert.equal(updateRecentDay(history, day, { gymDay: true }, now), history);
    }
  });

  test("an expired date cannot be edited after midnight", () => {
    const history = {};
    assert.equal(updateRecentDay(history, "2026-10-05", { gymDay: true }, new Date("2026-10-08T00:00:01")), history);
  });

  test("historical corrections and clears survive reload and stale cloud merges", () => {
    const day = "2026-10-06";
    const remote = { [day]: { ...emptyEntry(), morningMed: true, updatedAt: 1 } };
    const corrected = updateRecentDay(remote, day, { morningMed: false }, now);
    const reloaded = normalizeHistory(JSON.parse(JSON.stringify(corrected)));
    assert.equal(mergeHistories(reloaded, remote)[day].morningMed, false);
    assert.equal(mergeHistories(remote, reloaded)[day].morningMed, false);
  });
});
