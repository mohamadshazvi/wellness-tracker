"use client";

import { useState } from "react";
import CheckRow from "./CheckRow";
import Section from "./Section";
import { PRAYERS, type DayEntry } from "../lib/wellness";

export default function TodayTab({
  today,
  updateToday,
}: {
  today: DayEntry;
  updateToday: (patch: Partial<DayEntry>) => void;
}) {
  // While typing, the draft holds the raw text so intermediate input ("8.")
  // is never bounced; when it is null the field mirrors the committed value,
  // so weight changes merged from the cloud flow straight through.
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const weightText = weightDraft ?? (today.weight === null ? "" : String(today.weight));

  const commitWeight = () => {
    if (weightDraft === null) return;
    const text = weightDraft.trim();
    const parsed = text === "" ? null : Number(text);
    if (text === "" || Number.isFinite(parsed)) {
      updateToday({ weight: parsed });
    }
    // Drop the draft either way: a valid parse is committed above and an
    // invalid one is discarded, restoring the last committed value.
    setWeightDraft(null);
  };
  const togglePrayer = (name: string) =>
    updateToday({
      prayers: {
        ...(today.prayers || {}),
        [name]: !(today.prayers || {})[name],
      },
    });

  const setFitness = (kind: "gym" | "rest") =>
    kind === "gym"
      ? updateToday({ gymDay: !today.gymDay, restDay: false })
      : updateToday({ restDay: !today.restDay, gymDay: false });

  return (
    <div className="space-y-6">
      <Section title="Spiritual" staggerClass="stagger-1">
        {PRAYERS.map((p) => (
          <CheckRow
            key={p}
            label={p}
            checked={(today.prayers || {})[p]}
            onToggle={() => togglePrayer(p)}
          />
        ))}
      </Section>

      <Section title="Physical & Diet" staggerClass="stagger-2">
        <CheckRow
          label="Gym Session"
          checked={today.gymDay}
          onToggle={() => setFitness("gym")}
        />
        <CheckRow
          label="Active Rest Day"
          checked={today.restDay}
          onToggle={() => setFitness("rest")}
        />
        <CheckRow
          label="Zero Junk Food"
          checked={today.avoidedJunk}
          onToggle={() => updateToday({ avoidedJunk: !today.avoidedJunk })}
        />
        <CheckRow
          label="No Dinner"
          checked={today.noDinner}
          onToggle={() => updateToday({ noDinner: !today.noDinner })}
        />
      </Section>

      <Section title="Health & Metrics" staggerClass="stagger-3">
        <CheckRow
          label="Morning Supplement"
          checked={today.morningMed}
          onToggle={() => updateToday({ morningMed: !today.morningMed })}
        />
        <CheckRow
          label="Night Supplement"
          checked={today.nightMed}
          onToggle={() => updateToday({ nightMed: !today.nightMed })}
        />
        <div className="flex items-center justify-between py-4">
          <label
            htmlFor="body-weight"
            className="text-[15px] font-medium text-zinc-400"
          >
            Body Weight
          </label>
          <div className="flex items-center gap-2">
            <input
              id="body-weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={weightText}
              onChange={(e) => setWeightDraft(e.target.value)}
              onBlur={commitWeight}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="w-24 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-right text-[15px] font-bold text-zinc-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder-zinc-600"
              placeholder="0.0"
            />
            <span className="text-[13px] font-medium text-zinc-500">kg</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
