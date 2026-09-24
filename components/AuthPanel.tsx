"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Mail } from "lucide-react";

const PROVIDERS = [
  { id: "google" as const, label: "Google", mark: "G" },
  { id: "facebook" as const, label: "Facebook", mark: "f" },
  { id: "apple" as const, label: "Apple", mark: "apple" },
];

export default function AuthPanel({
  onLogin,
  onLoginWithProvider,
  onResetPassword,
  authError,
}: {
  onLogin: (
    email: string,
    password: string,
    mode: "signin" | "signup",
  ) => Promise<void>;
  onLoginWithProvider: (
    provider: "google" | "facebook" | "apple",
  ) => Promise<void>;
  onResetPassword: (email: string) => Promise<boolean>;
  authError: string | null;
}) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const submit = () => {
    setResetNotice(null);
    if (!emailInput.trim() || !passwordInput) {
      setValidationError("Enter both your email address and a password.");
      return;
    }
    if (authMode === "signup" && passwordInput.length < 6) {
      setValidationError("Choose a password with at least 6 characters.");
      return;
    }
    setValidationError(null);
    onLogin(emailInput.trim(), passwordInput, authMode);
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(39,39,42,0.92),rgba(24,24,27,0.82))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl animate-fade-up"
    >
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
      <div className="mb-8 text-center">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400/80">
          Private wellness space
        </p>
        <h2 className="text-[26px] font-bold tracking-[-0.02em] text-zinc-50">
          {authMode === "signin" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-2 text-[13px] text-zinc-400">
          {authMode === "signin"
            ? "Sign in to continue your daily progress."
            : "Save your wellness history securely in the cloud."}
        </p>
      </div>

      <div className="mb-5 flex rounded-xl border border-zinc-800 bg-zinc-950/60 p-1">
        {(["signin", "signup"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={authMode === mode}
            onClick={() => setAuthMode(mode)}
            className={`flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-all ${authMode === mode ? "bg-zinc-800 text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Email address</span>
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            size={17}
            aria-hidden="true"
          />
          <input
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-3.5 pl-11 pr-4 text-[14px] text-zinc-50 outline-none transition-all placeholder-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
        </label>
        <label className="relative block">
          <span className="sr-only">Password</span>
          <input
            type={showPassword ? "text" : "password"}
            autoComplete={
              authMode === "signup" ? "new-password" : "current-password"
            }
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3.5 pr-12 text-[14px] text-zinc-50 outline-none transition-all placeholder-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-500 transition-colors hover:text-zinc-200"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </label>
      </div>

      {/* Validation and auth failures render inline instead of alert(). */}
      {(validationError || authError) && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-rose-200"
        >
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
          {validationError ?? authError}
        </p>
      )}

      {authMode === "signin" && (
        <button
          type="button"
          onClick={async () => {
            setValidationError(null);
            if (!emailInput.trim()) {
              setResetNotice(null);
              setValidationError("Enter your email address first, then tap Forgot password.");
              return;
            }
            const sent = await onResetPassword(emailInput.trim());
            setResetNotice(
              sent
                ? `Password reset email sent to ${emailInput.trim()}.`
                : null,
            );
          }}
          className="mt-3 text-[12px] font-medium text-emerald-400 transition-colors hover:text-emerald-300"
        >
          Forgot password?
        </button>
      )}

      {resetNotice && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-emerald-200"
        >
          {resetNotice}
        </p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-xl border border-emerald-300/20 bg-emerald-400 py-3.5 text-[14px] font-bold text-zinc-950 shadow-[0_8px_24px_rgba(16,185,129,0.18)] transition-all hover:bg-emerald-300 hover:shadow-[0_10px_30px_rgba(16,185,129,0.28)] active:scale-[0.98]"
      >
        {authMode === "signin" ? "Sign in" : "Create account"}
      </button>

      <div className="my-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
        <div className="h-px flex-1 bg-zinc-800" />
        <span>or continue with</span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {PROVIDERS.map((provider, index) => (
          <button
            key={provider.id}
            type="button"
            aria-label={`Continue with ${provider.label}`}
            onClick={() => onLoginWithProvider(provider.id)}
            className={`group flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/45 text-zinc-300 transition-all hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-50 active:translate-y-0 animate-fade-up stagger-${index + 1}`}
          >
            <span
              className={`text-[20px] font-bold leading-none ${provider.id === "google" ? "text-red-400" : provider.id === "facebook" ? "text-blue-400" : "text-zinc-100"}`}
            >
              {provider.mark === "apple" ? "A" : provider.mark}
            </span>
            <span className="sr-only">{provider.label}</span>
          </button>
        ))}
      </div>

      <p className="mt-5 text-center text-[12px] text-zinc-500">
        Your wellness data is protected by Firebase authentication.
      </p>
    </form>
  );
}
