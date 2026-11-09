"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TRIAL_DAYS } from "@/lib/trial";

type Mode = "login" | "register";

export function AuthForm({ initialMode = "register" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Something went wrong. Try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex rounded-full border border-violet-400/20 bg-black/40 p-1">
        {(["register", "login"] as Mode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              setError(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === option
                ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_8px_24px_-10px_rgba(168,85,247,0.9)]"
                : "text-violet-200/70 hover:text-violet-100"
            }`}
            aria-pressed={mode === option}
          >
            {option === "register" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-violet-300/75">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-violet-300/75">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="field"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy
            ? "Please wait…"
            : mode === "register"
              ? `Create account · ${TRIAL_DAYS}-day free trial`
              : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs leading-relaxed text-violet-300/60">
        {mode === "register"
          ? `Every new account starts a ${TRIAL_DAYS}-day free trial. No card needed to begin.`
          : "Signed out? Sign in with the email and password you registered."}
      </p>
    </div>
  );
}
