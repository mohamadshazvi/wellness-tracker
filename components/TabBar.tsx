"use client";

import {
  Home as HomeIcon,
  Calendar as CalendarIcon,
  BarChart2,
  User,
} from "lucide-react";

export type TabId = "today" | "calendar" | "stats" | "profile";

const TABS: { id: TabId; icon: typeof HomeIcon; label: string }[] = [
  { id: "today", icon: HomeIcon, label: "Today" },
  { id: "calendar", icon: CalendarIcon, label: "Calendar" },
  { id: "stats", icon: BarChart2, label: "Stats" },
  { id: "profile", icon: User, label: "Profile" },
];

export default function TabBar({
  tab,
  onTabChange,
}: {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <nav aria-label="Main navigation" className="fixed bottom-6 left-0 right-0 z-50 mx-auto flex max-w-[340px] items-center justify-between gap-1 rounded-full glass-panel p-2">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = tab === t.id;
        return (
          <button
            key={t.id}
            aria-label={t.label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onTabChange(t.id)}
            className={`relative flex items-center justify-center h-12 rounded-full transition-all duration-500 ease-out overflow-hidden ${isActive ? "w-20 sm:w-28 text-zinc-50 bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" : "w-12 sm:w-14 text-zinc-500 hover:text-zinc-300"}`}
          >
            <Icon
              aria-hidden="true"
              size={20}
              className={`relative z-10 transition-transform duration-500 flex-shrink-0 ${isActive ? "scale-110 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)] mr-2" : ""}`}
              strokeWidth={isActive ? 2.5 : 2}
            />
            {isActive && (
              <span
                className="text-[12px] font-bold tracking-wide animate-fade-up whitespace-nowrap"
                style={{ animationDuration: "0.3s" }}
              >
                {t.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
