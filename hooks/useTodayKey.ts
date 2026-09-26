"use client";

import { useEffect, useState } from "react";
import { getLocalISODate } from "../lib/wellness";

/** Refresh after local midnight, and after a suspended tab becomes active. */
export function useTodayKey() {
  const [todayKey, setTodayKey] = useState(() => getLocalISODate());

  useEffect(() => {
    let timeout: number;
    const refresh = () => {
      window.clearTimeout(timeout);
      const now = new Date();
      setTodayKey(getLocalISODate(now));
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timeout = window.setTimeout(refresh, midnight.getTime() - now.getTime());
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return todayKey;
}
