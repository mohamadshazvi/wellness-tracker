"use client";

import AccountPanel from "./AccountPanel";
import AuthPanel from "./AuthPanel";
import type { WellnessData } from "../hooks/useWellnessData";

export default function ProfileTab({ wellness, onContinueLocally }: { wellness: WellnessData; onContinueLocally?: () => void }) {
  return (
    <div className="animate-fade-up">
      <header className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight leading-tight text-zinc-50 drop-shadow-sm">
          Your Account
        </h1>
        <p className="text-[14px] text-zinc-400 mt-1">
          Cloud sync & database settings
        </p>
      </header>

      {wellness.user ? (
        <AccountPanel
          user={wellness.user}
          history={wellness.history}
          todayKey={wellness.todayKey}
          syncStatus={wellness.syncStatus}
          syncError={wellness.syncError}
          lastSyncedAt={wellness.lastSyncedAt}
          onSync={wellness.syncData}
          onLogout={wellness.logout}
          onChangeName={wellness.changeName}
        />
      ) : (
        <AuthPanel
          onLogin={wellness.login}
          onLoginWithProvider={wellness.loginWithProvider}
          onResetPassword={wellness.resetPassword}
          authError={wellness.authError}
          onContinueLocally={onContinueLocally}
        />
      )}
    </div>
  );
}
