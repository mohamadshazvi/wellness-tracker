"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { weightSummary, type WeightRecord } from "../lib/extras";

export default function WeightTab({ weights, todayKey, onSave }: {
  weights: Record<string, WeightRecord>;
  todayKey: string;
  onSave: (date: string, record: Omit<WeightRecord, "updatedAt">) => void;
}) {
  const [date, setDate] = useState(todayKey);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [milestone, setMilestone] = useState("");
  const [selectedMilestone, setSelectedMilestone] = useState("");
  const [error, setError] = useState("");
  const { entries, latest, change, lowest, highest } = weightSummary(weights);
  const milestones = entries.filter(([, item]) => item.milestone);
  const selected = weights[selectedMilestone];
  const sinceMilestone = latest !== null && selected?.weight != null ? latest - selected.weight : null;
  const chartData = entries.map(([key, item], index) => ({
    date: key, weight: item.weight, latest: index === entries.length - 1 ? item.weight : null,
  }));

  const edit = (key: string) => {
    const item = weights[key];
    setDate(key);
    setWeight(item.weight === null ? "" : String(item.weight));
    setNote(item.note);
    setMilestone(item.milestone);
    setError("");
  };
  const save = () => {
    const value = Number(weight);
    if (!date || date > todayKey || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) {
      setError("Choose a valid date that is not in the future."); return;
    }
    if (!weight.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Enter a weight greater than 0 kg."); return;
    }
    onSave(date, { weight: value, note: note.trim().slice(0, 200), milestone: milestone.trim().slice(0, 80) });
    setError("");
  };
  const formatChange = (value: number | null) => value === null ? "—" : `${value > 0 ? "+" : ""}${Number(value.toFixed(2))} kg`;

  return <div className="space-y-6 animate-fade-up">
    <section className="rounded-3xl border border-white/5 bg-zinc-900/80 p-5">
      <h2 className="mb-4 text-lg font-bold">Weight progress</h2>
      {entries.length ? <>
        <div className="grid grid-cols-2 gap-3 text-sm text-zinc-400">
          <p>Current <strong className="block text-xl text-zinc-50">{latest} kg</strong></p>
          <p>Since first <strong className="block text-xl text-zinc-50">{formatChange(change)}</strong></p>
          <p>Lowest <strong className="block text-lg text-zinc-50">{lowest} kg</strong></p>
          <p>Highest <strong className="block text-lg text-zinc-50">{highest} kg</strong></p>
        </div>
        <div className="mt-5 h-52" role="img" aria-label={`Weight trend from ${entries[0][0]} to ${entries.at(-1)?.[0]}. Current ${latest} kg.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 24, right: 14, bottom: 8, left: -18 }}>
              <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(key: string) => key.slice(5)} />
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 12 }} />
              <Line dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line dataKey="latest" stroke="none" dot={{ r: 7, fill: "#f59e0b", stroke: "#18181b" }} activeDot={false} legendType="none" />
              {milestones.map(([key, item]) => <ReferenceDot key={key} x={key} y={item.weight as number} r={5} fill="#a5b4fc" stroke="#18181b" />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </> : <p className="text-sm text-zinc-400">No weight entries yet. Add one below to begin tracking.</p>}
      {milestones.length > 0 && <div className="mt-4">
        <label className="text-sm text-zinc-400" htmlFor="milestone-select">Change since milestone</label>
        <select id="milestone-select" value={selectedMilestone} onChange={(e) => setSelectedMilestone(e.target.value)} className="mt-2 w-full rounded-lg bg-zinc-800 p-2 text-zinc-50">
          <option value="">Select milestone</option>
          {milestones.map(([key, item]) => <option key={key} value={key}>{item.milestone} · {key}</option>)}
        </select>
        {selectedMilestone && <p className="mt-2 text-sm text-zinc-300">{formatChange(sinceMilestone)}</p>}
      </div>}
    </section>
    <section className="rounded-3xl border border-white/5 bg-zinc-900/80 p-5">
      <h2 className="mb-4 text-lg font-bold">Log weight</h2>
      <div className="space-y-3">
        <label className="block text-sm text-zinc-400">Date<input type="date" max={todayKey} value={date} onChange={(e) => { setDate(e.target.value); const item = weights[e.target.value]; setWeight(item?.weight == null ? "" : String(item.weight)); setNote(item?.note ?? ""); setMilestone(item?.milestone ?? ""); }} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-50" /></label>
        <label className="block text-sm text-zinc-400">Weight (kg)<input inputMode="decimal" type="text" value={weight} onChange={(e) => setWeight(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-50" /></label>
        <label className="block text-sm text-zinc-400">Note (optional)<input maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-50" /></label>
        <label className="block text-sm text-zinc-400">Milestone label (optional)<input maxLength={80} value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Started Gym" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-zinc-50" /></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-400">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={save} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-zinc-950">Save entry</button>
        {weights[date]?.weight != null && <button type="button" onClick={() => { onSave(date, { weight: null, note: "", milestone: "" }); setWeight(""); setNote(""); setMilestone(""); if (selectedMilestone === date) setSelectedMilestone(""); }} className="rounded-xl border border-zinc-700 px-4 py-3 text-zinc-300">Delete</button>}
      </div>
    </section>
    {entries.length > 0 && <section className="rounded-3xl border border-white/5 bg-zinc-900/80 p-5">
      <h2 className="mb-3 text-lg font-bold">Entries</h2>
      <ul className="divide-y divide-zinc-800">{[...entries].reverse().map(([key, item], index) => <li key={key}>
        <button type="button" onClick={() => edit(key)} className="w-full py-3 text-left text-sm text-zinc-300">
          <span className="flex justify-between"><span>{key} {index === 0 && <span className="text-amber-400">· Latest</span>}</span><strong>{item.weight} kg</strong></span>
          {item.milestone && <span className="block text-xs text-indigo-300">Milestone: {item.milestone}</span>}
          {item.note && <span className="block text-xs text-zinc-500">{item.note}</span>}
        </button>
      </li>)}</ul>
    </section>}
  </div>;
}
