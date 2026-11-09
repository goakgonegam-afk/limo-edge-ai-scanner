"use client";

import { useState } from "react";

export function CheckoutButton({
  planId,
  label,
  highlight,
  disabled,
}: {
  planId: string;
  label: string;
  highlight: boolean;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Checkout could not be started.");
        return;
      }
      window.location.href = payload.url;
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={startCheckout}
        disabled={busy || disabled}
        className={highlight ? "btn-primary w-full" : "btn-ghost w-full"}
      >
        {busy ? "Opening secure checkout…" : label}
      </button>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
