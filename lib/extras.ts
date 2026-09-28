import { getLocalISODate, isRecord, type History } from "./wellness.ts";

export type QuestId = "handNails" | "footNails" | "laundry";
export const QUESTS: { id: QuestId; label: string; target: number; due?: number }[] = [
  { id: "handNails", label: "Hand nails", target: 1, due: 4 },
  { id: "footNails", label: "Foot nails", target: 2 },
  { id: "laundry", label: "Laundry", target: 1, due: 6 },
];

// Monday of the week containing the given local date.
export function weekKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return getLocalISODate(date);
}

export type QuestRecord = { days: string[]; edits: Record<string, { done: boolean; updatedAt: number }>; updatedAt: number };
export type WeightRecord = { weight: number | null; note: string; milestone: string; updatedAt: number };
export type Extras = { quests: Record<string, QuestRecord>; weights: Record<string, WeightRecord> };
export const emptyExtras = (): Extras => ({ quests: {}, weights: {} });
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeExtras(raw: unknown): Extras {
  const result = emptyExtras();
  if (!isRecord(raw)) return result;
  if (isRecord(raw.quests)) {
    for (const [key, value] of Object.entries(raw.quests)) {
      const [week, quest] = key.split(":");
      if (!DATE.test(week) || !QUESTS.some((q) => q.id === quest) || !isRecord(value)) continue;
      const updatedAt = typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0;
      const edits: QuestRecord["edits"] = {};
      if (isRecord(value.edits)) {
        for (const [day, edit] of Object.entries(value.edits)) {
          if (!DATE.test(day) || weekKey(day) !== week || !isRecord(edit)) continue;
          edits[day] = { done: edit.done === true,
            updatedAt: typeof edit.updatedAt === "number" && Number.isFinite(edit.updatedAt) ? edit.updatedAt : 0 };
        }
      } else if (Array.isArray(value.days)) {
        // Old weekly records contain only a list of completed dates.
        for (const day of value.days) {
          if (typeof day === "string" && DATE.test(day) && weekKey(day) === week) {
            edits[day] = { done: true, updatedAt };
          }
        }
      }
      result.quests[key] = { edits, days: Object.keys(edits).filter((day) => edits[day].done).sort(), updatedAt };
    }
  }
  if (isRecord(raw.weights)) {
    for (const [key, value] of Object.entries(raw.weights)) {
      if (!DATE.test(key) || !isRecord(value)) continue;
      const weight = typeof value.weight === "number" && Number.isFinite(value.weight) && value.weight > 0 ? value.weight : null;
      result.weights[key] = {
        weight,
        note: typeof value.note === "string" ? value.note.slice(0, 200) : "",
        milestone: typeof value.milestone === "string" ? value.milestone.slice(0, 80) : "",
        updatedAt: typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
      };
    }
  }
  return result;
}

export function mergeExtras(local: Extras, remote: Extras): Extras {
  const merged = emptyExtras();
  for (const key of new Set([...Object.keys(remote.quests), ...Object.keys(local.quests)])) {
    const a = local.quests[key];
    const b = remote.quests[key];
    if (!a || !b) { merged.quests[key] = a ?? b; continue; }
    // Empty legacy records represent a whole-week clear; modern records carry
    // per-day tombstones, allowing two devices to edit different days offline.
    if (!Object.keys(a.edits).length && a.updatedAt > b.updatedAt) { merged.quests[key] = a; continue; }
    if (!Object.keys(b.edits).length && b.updatedAt > a.updatedAt) { merged.quests[key] = b; continue; }
    const edits = { ...b.edits };
    for (const [day, edit] of Object.entries(a.edits)) {
      if (!edits[day] || edit.updatedAt >= edits[day].updatedAt) edits[day] = edit;
    }
    merged.quests[key] = { edits, days: Object.keys(edits).filter((day) => edits[day].done).sort(), updatedAt: Math.max(a.updatedAt, b.updatedAt) };
  }
  for (const [key, value] of Object.entries(remote.weights)) merged.weights[key] = value;
  for (const [key, value] of Object.entries(local.weights)) {
    const other = merged.weights[key];
    if (!other || value.updatedAt >= other.updatedAt) merged.weights[key] = value;
  }
  return merged;
}

/** Migrate legacy daily weights without overwriting a weight entry or its deletion. */
export function migrateWeights(extras: Extras, history: History): Extras {
  const weights = { ...extras.weights };
  for (const [date, day] of Object.entries(history)) {
    if (day.weight !== null && day.weight > 0 && !weights[date]) {
      weights[date] = { weight: day.weight, note: "", milestone: "", updatedAt: day.updatedAt };
    }
  }
  return { ...extras, weights };
}

export function weightSummary(weights: Extras["weights"]) {
  const entries = Object.entries(weights).filter(([, item]) => item.weight !== null).sort(([a], [b]) => a.localeCompare(b));
  const first = entries[0]?.[1].weight ?? null;
  const latest = entries.at(-1)?.[1].weight ?? null;
  const values = entries.map(([, item]) => item.weight as number);
  return { entries, first, latest, change: first !== null && latest !== null ? latest - first : null,
    lowest: values.length ? Math.min(...values) : null, highest: values.length ? Math.max(...values) : null };
}
