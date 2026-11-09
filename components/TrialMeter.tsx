"use client";

import { useEffect, useState } from "react";

function describe(ms: number): string {
  if (ms <= 0) return "Trial ended";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function TrialMeter({
  trialEndsAt,
  subscribed,
  planLabel,
}: {
  trialEndsAt: string;
  subscribed: boolean;
  planLabel?: string | null;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(trialEndsAt).getTime();
    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [trialEndsAt]);

  if (subscribed) {
    return (
      <span className="badge badge-mint">
        Subscription active{planLabel ? ` · ${planLabel}` : ""}
      </span>
    );
  }

  const label = remaining === null ? "Trial" : describe(remaining);
  const ended = remaining !== null && remaining <= 0;

  return (
    <span className={`badge ${ended ? "badge-rose" : "badge-amber"}`}>
      {ended ? "Free trial ended" : `Free trial · ${label}`}
    </span>
  );
}
