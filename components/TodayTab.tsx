"use client";

import { useState } from "react";
import CheckRow from "./CheckRow";
import Section from "./Section";
import { PRAYERS, type DayEntry } from "../lib/wellness";
import { QUESTS, weekKey, type Extras, type QuestId } from "../lib/extras";

export default function TodayTab({
  today,
  updateToday,
  todayKey,
  extras,
  privateChecked,
  togglePersonalGoal,
  toggleQuest,
  onWeightOpen,
  showWeeklyQuests = true,
}: {
  today: DayEntry;
  updateToday: (patch: Partial<DayEntry>) => void;
  todayKey: string;
  extras: Extras;
  privateChecked: boolean;
  togglePersonalGoal: () => void;
  toggleQuest: (id: QuestId, day?: string) => void;
  onWeightOpen: () => void;
  showWeeklyQuests?: boolean;
}) {
  const [personalOpen, setPersonalOpen] = useState(false);
  const togglePrayer = (name: string) =>
    updateToday({
      prayers: {
        ...(today.prayers || {}),
        [name]: !(today.prayers || {})[name],
      },
    });
  const toggleVoluntary = (name: "Tahajjud" | "Duha") =>
    updateToday({ voluntaryPrayers: { ...today.voluntaryPrayers, [name]: !today.voluntaryPrayers[name] } });

  const setFitness = (kind: "gym" | "rest") =>
    kind === "gym"
      ? updateToday({ gymDay: !today.gymDay, restDay: false })
      : updateToday({ restDay: !today.restDay, gymDay: false });

  return (
    <div className="space-y-6">
      <Section title="Spiritual" staggerClass="stagger-1">
        {(["Tahajjud", ...PRAYERS.slice(0, 1), "Duha", ...PRAYERS.slice(1)] as const).map((p) => (
          p === "Tahajjud" || p === "Duha" ? (
            <div key={p} className="my-2 rounded-xl border border-dashed border-zinc-700 px-3">
              <div className="flex items-center justify-between">
                <div className="flex-1"><CheckRow label={p} checked={today.voluntaryPrayers[p]} onToggle={() => toggleVoluntary(p)} /></div>
                <span className="ml-2 text-[10px] text-zinc-500">Voluntary</span>
              </div>
              {p === "Duha" && <p className="pb-3 text-xs text-zinc-500">Mid-morning, before noon</p>}
              {p === "Tahajjud" && today.voluntaryPrayers.Tahajjud && (
                <p className="pb-3 text-xs text-zinc-400">A prayer only the sincere ones wake up for.</p>
              )}
            </div>
          ) : (
          <CheckRow
            key={p}
            label={p}
            checked={(today.prayers || {})[p]}
            onToggle={() => togglePrayer(p)}
          />
          )
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
        <button type="button" onClick={onWeightOpen} className="py-4 text-sm text-emerald-400">Open weight tracker →</button>
      </Section>
      {showWeeklyQuests && <Section title="This Week’s Quests" staggerClass="stagger-4">
        <p className="py-2 text-xs text-zinc-500">Side quests reset each Monday. Tap once per day to record progress.</p>
        {QUESTS.map((quest) => {
          const days = extras.quests[`${weekKey(todayKey)}:${quest.id}`]?.days ?? [];
          const done = days.length >= quest.target;
          const weekday = new Date(`${todayKey}T12:00:00`).getDay() || 7;
          const overdue = !done && quest.due !== undefined && weekday > quest.due;
          return <div key={quest.id} className="border-b border-zinc-800 py-3">
            <button type="button" onClick={() => toggleQuest(quest.id)} disabled={done && !days.includes(todayKey)} aria-pressed={days.includes(todayKey)} className="w-full rounded-lg text-left text-sm text-zinc-200 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60">
              {quest.label} <span className="float-right text-zinc-400">{days.length}/{quest.target}</span>
            </button>
            <p className="mt-1 text-xs text-zinc-500">{done ? "Complete" : overdue ? "Overdue this week" : quest.due === 4 ? "Due Thursday" : quest.due === 6 ? "Due Saturday" : "Any two days"}</p>
            {days.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{days.map((day) => <button key={day} type="button" aria-label={`Remove ${quest.label} completion for ${day}`} onClick={() => toggleQuest(quest.id, day)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400">{day.slice(5)} ×</button>)}</div>}
          </div>;
        })}
      </Section>}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <button type="button" onClick={() => setPersonalOpen((open) => !open)} aria-expanded={personalOpen} className="w-full text-left text-sm text-zinc-400">Personal Goal <span className="float-right">{personalOpen ? "−" : "+"}</span></button>
        {personalOpen && <div className="mt-4 border-t border-zinc-800 pt-2">
          <CheckRow label={showWeeklyQuests ? "Stayed on track today" : "Stayed on track this day"} checked={privateChecked} onToggle={togglePersonalGoal} />
          <p className="text-xs text-zinc-500">Stored only on this device. Clearing browser data removes it.</p>
        </div>}
      </div>
    </div>
  );
}
