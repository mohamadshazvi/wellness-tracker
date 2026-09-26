"use client";

import { useTodayKey } from "./useTodayKey";
import { useWellnessAuth } from "./useWellnessAuth";
import { useWellnessHistory } from "./useWellnessHistory";

export type { WellnessUser } from "./useWellnessAuth";
export type { SyncStatus } from "./useWellnessHistory";

/** Coordinates the clock, account, and history behind the UI's existing API. */
export function useWellnessData() {
  const todayKey = useTodayKey();
  const { onIdentityChange, ...history } = useWellnessHistory(todayKey);
  const account = useWellnessAuth(onIdentityChange);

  return { ...history, ...account, todayKey };
}

export type WellnessData = ReturnType<typeof useWellnessData>;
