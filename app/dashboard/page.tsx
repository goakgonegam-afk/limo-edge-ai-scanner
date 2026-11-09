import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartAnalyzer } from "@/components/ChartAnalyzer";
import { SiteHeader } from "@/components/SiteHeader";
import { TrialMeter } from "@/components/TrialMeter";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { listAnalyses } from "@/lib/store";
import { TRIAL_DAYS } from "@/lib/trial";

export const metadata = { title: "Dashboard · Limo Edge" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const publicUser = toPublicUser(user);
  const history = await listAnalyses(user.id, 6);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Chart study lab</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-violet-50">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-violet-200/70">{publicUser.email}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <TrialMeter
                trialEndsAt={publicUser.trialEndsAt}
                subscribed={publicUser.subscriptionActive}
                planLabel={publicUser.subscription?.plan ?? null}
              />
              <Link href="/plans" className="text-xs text-violet-300 underline decoration-violet-400/40 underline-offset-4">
                Manage subscription
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-violet-400/15 bg-black/40 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/60">Access</p>
              <p className="mt-1 text-sm font-semibold text-violet-50">
                {publicUser.accessReason === "subscription"
                  ? "Paid subscription"
                  : publicUser.accessReason === "trial"
                    ? `${publicUser.trialDaysLeft} day${publicUser.trialDaysLeft === 1 ? "" : "s"} of trial left`
                    : "Trial ended"}
              </p>
            </div>
            <div className="rounded-xl border border-violet-400/15 bg-black/40 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/60">Analyses saved</p>
              <p className="stat-value mt-1 text-sm font-semibold text-violet-50">{publicUser.analysisCount}</p>
            </div>
            <div className="rounded-xl border border-violet-400/15 bg-black/40 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/60">Trial length</p>
              <p className="mt-1 text-sm font-semibold text-violet-50">{TRIAL_DAYS} days per account</p>
            </div>
          </div>
        </section>

        <div className="mt-5">
          <ChartAnalyzer hasAccess={publicUser.hasAccess} />
        </div>

        <section className="card mt-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-violet-50">Recent analyses</h2>
            <span className="badge">Practice log</span>
          </div>

          {history.length === 0 ? (
            <p className="mt-3 text-sm text-violet-200/65">
              Nothing saved yet. Upload your first screenshot above and the practice levels will be
              logged here.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead>
                  <tr className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/60">
                    <th className="pb-2 font-medium">When</th>
                    <th className="pb-2 font-medium">Symbol</th>
                    <th className="pb-2 font-medium">Bias</th>
                    <th className="pb-2 font-medium">Entry</th>
                    <th className="pb-2 font-medium">Stop</th>
                    <th className="pb-2 font-medium">Target</th>
                    <th className="pb-2 font-medium">RSI</th>
                  </tr>
                </thead>
                <tbody className="text-violet-100/85">
                  {history.map((entry) => (
                    <tr key={entry.id} className="border-t border-violet-400/10">
                      <td className="py-2 text-xs text-violet-300/70">{formatDateTime(entry.createdAt)}</td>
                      <td className="py-2 font-medium">{entry.symbol}</td>
                      <td className="py-2">
                        <span className={`badge ${entry.bias === "long" ? "badge-mint" : "badge-rose"}`}>
                          {entry.bias}
                        </span>
                      </td>
                      <td className="stat-value py-2">{formatPrice(entry.entry)}</td>
                      <td className="stat-value py-2 text-rose-200">{formatPrice(entry.stopLoss)}</td>
                      <td className="stat-value py-2 text-emerald-200">{formatPrice(entry.takeProfit)}</td>
                      <td className="stat-value py-2">{entry.rsi14 === null ? "—" : entry.rsi14.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-[0.7rem] leading-relaxed text-violet-300/55">
            Saved levels are study notes for paper trading only. Limo Edge never places orders and is
            not financial advice.
          </p>
        </section>
      </main>
    </div>
  );
}
