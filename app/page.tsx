import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getSessionUser } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/trial";

const features = [
  {
    title: "Screenshot in, structure out",
    body: "Snap your phone chart, and the app rebuilds the price path from the pixels — candles or line, light or dark theme.",
    icon: "📱",
  },
  {
    title: "The four indicators that matter",
    body: "EMA 50 for short-term trend, EMA 200 for the long-term bias, RSI 14 for momentum and ATR 14 for volatility.",
    icon: "📐",
  },
  {
    title: "Practice levels, not predictions",
    body: "A structured entry, stop-loss and take-profit with the risk percentage and reward ratio already worked out.",
    icon: "🎯",
  },
  {
    title: "Learn while you look",
    body: "Every number comes with a plain-English explanation, so the next chart teaches you instead of confusing you.",
    icon: "🧠",
  },
];

const steps = [
  { step: "01", title: "Create an account", body: `Your ${TRIAL_DAYS}-day free trial starts instantly — no card needed to look around.` },
  { step: "02", title: "Upload a screenshot", body: "Take a photo of the chart or pick one from your gallery. Crop tight to the candles." },
  { step: "03", title: "Read the analysis", body: "Indicators, trend, momentum and volatility with the reasoning behind each one." },
  { step: "04", title: "Practise the plan", body: "Paper-trade the entry, stop and target. Track whether the structure held." },
];

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="badge">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              Educational tool · paper trading only
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-violet-50 sm:text-5xl lg:text-6xl">
              Turn a chart screenshot into a{" "}
              <span className="text-shine">structured study plan</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-violet-200/80">
              Upload a screenshot from your phone and Limo Edge reads the price path, then explains
              EMA 50, EMA 200, RSI 14 and ATR 14 in plain English — with practice entry, stop-loss
              and take-profit levels you can rehearse without risking a cent.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary">
                Start {TRIAL_DAYS}-day free trial
              </Link>
              <Link href="/plans" className="btn-ghost">
                See plans
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { k: "4", v: "core indicators" },
                { k: "3", v: "practice levels" },
                { k: `${TRIAL_DAYS}`, v: "free trial days" },
              ].map((item) => (
                <div key={item.v} className="card px-3 py-3">
                  <dt className="stat-value text-2xl font-semibold text-shine">{item.k}</dt>
                  <dd className="text-[0.7rem] uppercase tracking-[0.12em] text-violet-300/70">
                    {item.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card card-shine p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Sample analysis</p>
                <p className="mt-1 text-lg font-semibold text-violet-50">BTC/USDT · 1H</p>
              </div>
              <span className="badge badge-mint">Bullish structure</span>
            </div>

            <svg viewBox="0 0 320 150" className="mt-5 w-full" role="img" aria-label="Sample chart with two moving averages">
              <defs>
                <linearGradient id="glowLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 118 L26 104 L52 112 L78 88 L104 96 L130 74 L156 82 L182 60 L208 66 L234 44 L260 52 L286 34 L320 26 L320 150 L0 150 Z"
                fill="url(#fillArea)"
              />
              <path
                d="M0 118 L26 104 L52 112 L78 88 L104 96 L130 74 L156 82 L182 60 L208 66 L234 44 L260 52 L286 34 L320 26"
                fill="none"
                stroke="url(#glowLine)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M0 128 L40 118 L80 110 L120 100 L160 92 L200 80 L240 70 L280 58 L320 48"
                fill="none"
                stroke="#34d399"
                strokeWidth="1.6"
                strokeDasharray="5 4"
                opacity="0.9"
              />
              <path
                d="M0 138 L60 132 L120 122 L180 114 L240 100 L320 84"
                fill="none"
                stroke="#f0abfc"
                strokeWidth="1.6"
                strokeDasharray="5 4"
                opacity="0.75"
              />
            </svg>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {[
                { label: "EMA 50", value: "64,182", tone: "text-emerald-300" },
                { label: "EMA 200", value: "61,904", tone: "text-fuchsia-300" },
                { label: "RSI 14", value: "58.4", tone: "text-violet-200" },
                { label: "ATR 14", value: "812.6", tone: "text-violet-200" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-violet-400/15 bg-black/40 px-3 py-2">
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/60">
                    {item.label}
                  </p>
                  <p className={`stat-value text-sm font-semibold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-violet-400/20 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 px-3 py-2.5">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/70">
                Paper plan
              </p>
              <p className="mt-1 text-sm text-violet-50">
                Entry <span className="font-semibold">64,100</span> · Stop{" "}
                <span className="font-semibold text-rose-300">62,880</span> · Target{" "}
                <span className="font-semibold text-emerald-300">66,540</span>
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-violet-50 sm:text-3xl">
            Built to teach the chart, not to sell a signal
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article key={feature.title} className="card card-hover card-shine p-5">
                <span className="text-xl" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3 className="mt-3 text-sm font-semibold text-violet-50">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-violet-200/70">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="hairline" />
          <h2 className="mt-10 text-2xl font-semibold tracking-tight text-violet-50 sm:text-3xl">
            Four steps from screenshot to study plan
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <article key={item.step} className="card p-5">
                <span className="stat-value text-xs font-semibold tracking-[0.2em] text-fuchsia-300/80">
                  {item.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-violet-50">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-violet-200/70">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card mt-16 p-6 sm:p-8">
          <p className="eyebrow">Read this first</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-violet-200/75">
            Limo Edge is an educational tool for paper-trading practice. Chart levels are inferred
            from a screenshot, not from an exchange feed, and nothing here is financial advice. The
            app never places orders and never touches a brokerage account.
          </p>
        </section>
      </main>
    </div>
  );
}
