"use client";

import { AlertTriangle } from "lucide-react";

export default function SyncErrorBanner({
  message,
  busy,
  onRetry,
}: {
  message: string;
  busy: boolean;
  onRetry: () => Promise<boolean>;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 backdrop-blur-xl animate-fade-up"
    >
      <AlertTriangle
        size={18}
        className="mt-0.5 flex-shrink-0 text-rose-400"
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="text-[13px] font-bold text-rose-200">Cloud sync paused</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-rose-200/80">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void onRetry()}
        disabled={busy}
        className="flex-shrink-0 rounded-lg border border-rose-400/30 px-3 py-1.5 text-[12px] font-bold text-rose-100 transition-all hover:bg-rose-500/20 active:scale-95 disabled:opacity-50"
      >
        {busy ? "Retrying..." : "Retry"}
      </button>
    </div>
  );
}
