"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type State = "checking" | "confirmed" | "pending" | "error";

export function ConfirmCheckout() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!sessionId) {
      setState("error");
      setMessage("This page needs the Stripe session id from the checkout redirect.");
      return;
    }

    let cancelled = false;

    async function confirm() {
      try {
        const response = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
        if (cancelled) return;

        if (response.ok && payload.ok) {
          setState("confirmed");
          router.refresh();
          return;
        }
        if (response.status === 409) {
          setState("pending");
          setMessage(payload.error ?? "Stripe is still confirming the payment.");
          return;
        }
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        setState("error");
        setMessage(payload.error ?? "The payment could not be confirmed.");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Network error while confirming the payment.");
        }
      }
    }

    void confirm();
    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  return (
    <div className="card mx-auto mt-8 max-w-lg p-6 text-center">
      {state === "checking" ? (
        <>
          <span className="badge">Verifying with Stripe</span>
          <h1 className="mt-4 text-xl font-semibold text-violet-50">Confirming your payment…</h1>
          <p className="mt-2 text-sm text-violet-200/70">This takes a couple of seconds.</p>
        </>
      ) : null}

      {state === "confirmed" ? (
        <>
          <span className="badge badge-mint">Subscription active</span>
          <h1 className="mt-4 text-xl font-semibold text-violet-50">You&apos;re all set</h1>
          <p className="mt-2 text-sm text-violet-200/70">
            Payment confirmed. Unlimited screenshot analyses are unlocked on this account.
          </p>
          <Link href="/dashboard" className="btn-primary mt-5 inline-flex">
            Open the dashboard
          </Link>
        </>
      ) : null}

      {state === "pending" ? (
        <>
          <span className="badge">Payment processing</span>
          <h1 className="mt-4 text-xl font-semibold text-violet-50">Almost there</h1>
          <p className="mt-2 text-sm text-violet-200/70">
            {message ?? "Stripe is still finalising the payment."} Your access unlocks automatically
            once Stripe confirms it — no need to pay again.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="btn-primary">
              Check dashboard
            </Link>
            <Link href="/plans" className="btn-ghost">
              Back to plans
            </Link>
          </div>
        </>
      ) : null}

      {state === "error" ? (
        <>
          <span className="badge badge-rose">Not confirmed</span>
          <h1 className="mt-4 text-xl font-semibold text-violet-50">We couldn&apos;t confirm that payment</h1>
          <p className="mt-2 text-sm text-violet-200/70">{message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/plans" className="btn-primary">
              Back to plans
            </Link>
            <Link href="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
