"use client";

export default function Section({
  title,
  children,
  staggerClass = "",
  extraHeader,
}: {
  title: string;
  children: React.ReactNode;
  staggerClass?: string;
  extraHeader?: React.ReactNode;
}) {
  return (
    <div
      className={`mb-6 rounded-3xl bg-zinc-900/80 p-5 shadow-2xl border border-white/5 opacity-0 animate-fade-up backdrop-blur-xl ${staggerClass}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          {title}
        </h2>
        {extraHeader}
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}
