"use client";

import { CheckCircle2, Circle } from "lucide-react";

export default function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      className="group flex w-full items-center justify-between rounded-lg py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
    >
      <span
        className={`text-[15px] font-medium transition-all duration-300 ${checked ? "text-zinc-50" : "text-zinc-400 group-hover:text-zinc-300"}`}
      >
        {label}
      </span>
      <div
        className={`relative flex flex-shrink-0 items-center justify-center transition-all duration-300 ${checked ? "text-emerald-500 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "text-zinc-700 group-hover:text-zinc-500 group-active:scale-90"}`}
      >
        {checked ? (
          <CheckCircle2 size={28} strokeWidth={2.5} className="animate-pop" />
        ) : (
          <Circle size={28} strokeWidth={2} />
        )}
      </div>
    </button>
  );
}
