import { formatPercent, formatPrice, formatRatio } from "@/lib/format";
import type { AnalysisResult } from "@/lib/analysis";
import { ChartView } from "./ChartView";

function Metric({
  label,
  value,
  hint,
  tone = "text-violet-50",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-violet-400/15 bg-black/40 p-3">
      <p className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/60">{label}</p>
      <p className={`stat-value mt-1 text-lg font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-[0.7rem] leading-snug text-violet-300/60">{hint}</p>
    </div>
  );
}

export function AnalysisReport({ analysis }: { analysis: AnalysisResult }) {
  const { indicators, plan, narrative, scale } = analysis;
  const trendTone =
    indicators.trend === "up" ? "text-emerald-300" : indicators.trend === "down" ? "text-rose-300" : "text-violet-200";

  return (
    <div className="space-y-4">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Educational analysis</p>
            <h2 className="mt-1 text-xl font-semibold text-violet-50">
              {analysis.symbol} · {analysis.bars} columns · {analysis.chartType}
            </h2>
            <p className="mt-1 text-xs text-violet-300/60">
              Scale: {scale.mode === "user_range" ? "your visible high/low" : "estimated 4% band"} ·
              range {formatPrice(scale.rangeLow)} – {formatPrice(scale.rangeHigh)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`badge ${plan.bias === "long" ? "badge-mint" : "badge-rose"}`}>
              {plan.bias === "long" ? "Long practice setup" : "Short practice setup"}
            </span>
            <span className="badge">Paper trading only</span>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-violet-400/20 bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 px-4 py-3 text-sm font-medium text-violet-50">
          {narrative.headline}
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="EMA 50"
            value={formatPrice(indicators.ema50)}
            hint={
              indicators.ema50 === null
                ? "Needs 50 columns"
                : analysis.lastClose >= indicators.ema50
                  ? "Price is above the fast average"
                  : "Price is below the fast average"
            }
            tone="text-emerald-300"
          />
          <Metric
            label="EMA 200"
            value={formatPrice(indicators.ema200)}
            hint={indicators.ema200 === null ? "Needs 200 columns for a full read" : "Long-term trend anchor"}
            tone="text-fuchsia-300"
          />
          <Metric
            label="RSI 14"
            value={indicators.rsi14 === null ? "—" : indicators.rsi14.toFixed(1)}
            hint={
              indicators.momentum === "overbought"
                ? "Overbought (>70)"
                : indicators.momentum === "oversold"
                  ? "Oversold (<30)"
                  : "Neutral momentum"
            }
            tone="text-violet-100"
          />
          <Metric
            label="ATR 14"
            value={formatPrice(indicators.atr14)}
            hint={indicators.atrPercent === null ? "Volatility per column" : `${formatPercent(indicators.atrPercent)} of price per column`}
            tone="text-violet-100"
          />
        </div>

        <p className="mt-3 text-sm text-violet-200/75">
          Trend structure: <span className={`font-semibold ${trendTone}`}>{indicators.trend}</span> ·
          last close {formatPrice(analysis.lastClose)} · swing high {formatPrice(analysis.reference.swingHigh)} ·
          swing low {formatPrice(analysis.reference.swingLow)}
        </p>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-violet-50">Practice levels</h3>
          <span className="badge badge-amber">Not a trade recommendation</span>
        </div>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-violet-300/70">Entry</p>
            <p className="stat-value mt-1 text-xl font-semibold text-violet-50">{formatPrice(plan.entry)}</p>
            <p className="mt-1 text-[0.7rem] text-violet-300/60">Where the setup becomes active</p>
          </div>
          <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-rose-200/80">Stop-loss</p>
            <p className="stat-value mt-1 text-xl font-semibold text-rose-200">{formatPrice(plan.stopLoss)}</p>
            <p className="mt-1 text-[0.7rem] text-rose-200/60">
              {formatPercent(plan.riskPercent)} risk · 1.5× ATR
            </p>
          </div>
          <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-emerald-200/80">Take-profit</p>
            <p className="stat-value mt-1 text-xl font-semibold text-emerald-200">{formatPrice(plan.takeProfit)}</p>
            <p className="mt-1 text-[0.7rem] text-emerald-200/60">
              {formatPercent(plan.rewardPercent)} reward · {formatRatio(plan.riskReward, 1)}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-violet-300/70 sm:grid-cols-3">
          <p>Risk per unit: {formatPrice(plan.riskPerUnit)}</p>
          <p>Reward per unit: {formatPrice(plan.rewardPerUnit)}</p>
          <p>Reward-to-risk: {formatRatio(plan.riskReward, 2)}</p>
        </div>

        <div className="mt-4">
          <ChartView series={analysis.series} plan={plan} />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-violet-50">What the indicators are saying</h3>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-violet-200/80">
          <p>
            <span className="font-semibold text-emerald-300">Trend · </span>
            {narrative.trend}
          </p>
          <p>
            <span className="font-semibold text-violet-200">Momentum · </span>
            {narrative.momentum}
          </p>
          <p>
            <span className="font-semibold text-fuchsia-300">Volatility · </span>
            {narrative.volatility}
          </p>
          <p>
            <span className="font-semibold text-violet-100">Setup · </span>
            {narrative.setup}
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-violet-50">Before you practise it</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-violet-200/80">
            {narrative.checklist.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-violet-50">Learn the four indicators</h3>
          <div className="mt-3 space-y-2">
            {narrative.learning.map((card) => (
              <details key={card.title} className="rounded-xl border border-violet-400/15 bg-black/35 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-violet-100 marker:text-fuchsia-400">
                  {card.title}
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-violet-200/70">{card.body}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {analysis.warnings.length > 0 ? (
        <section className="card border-amber-400/25 p-5">
          <h3 className="text-sm font-semibold text-amber-200">Read the fine print</h3>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-amber-100/80">
            {analysis.warnings.map((warning) => (
              <li key={warning} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="rounded-xl border border-violet-400/15 bg-black/40 px-4 py-3 text-[0.72rem] leading-relaxed text-violet-300/60">
        {analysis.disclaimer}
      </p>
    </div>
  );
}
