import { formatPercent, formatPrice } from "./format";
import { atr, ema, lastValue, rsi, swingLevels, type OhlcBar } from "./indicators";
import type { ChartType, NormalizedBar } from "./types";

export const EMA_FAST_PERIOD = 50;
export const EMA_SLOW_PERIOD = 200;
export const RSI_PERIOD = 14;
export const ATR_PERIOD = 14;
export const ATR_STOP_MULTIPLE = 1.5;
export const REWARD_MULTIPLE = 2;

export const DISCLAIMER =
  "Limo Edge is an educational tool for paper-trading practice. Levels are derived from a screenshot, " +
  "not from exchange data, and are not financial advice. Never risk real money based on this output.";

export type TrendBias = "up" | "down" | "range";
export type TradeBias = "long" | "short";

export type AnalysisInput = {
  symbol?: string | null;
  lastPrice: number;
  rangeHigh?: number | null;
  rangeLow?: number | null;
  chartType?: ChartType;
  bars: NormalizedBar[];
};

export type TradePlan = {
  bias: TradeBias;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskPerUnit: number;
  rewardPerUnit: number;
  riskReward: number;
  riskPercent: number;
  rewardPercent: number;
};

export type LearningCard = { title: string; body: string };

export type AnalysisResult = {
  symbol: string;
  createdAt: string;
  bars: number;
  chartType: ChartType;
  scale: {
    mode: "user_range" | "estimated";
    rangeHigh: number;
    rangeLow: number;
    priceSpan: number;
    note: string;
  };
  lastClose: number;
  indicators: {
    ema50: number | null;
    ema200: number | null;
    rsi14: number | null;
    atr14: number | null;
    atrPercent: number | null;
    trend: TrendBias;
    momentum: "overbought" | "oversold" | "neutral";
  };
  plan: TradePlan;
  reference: { swingHigh: number; swingLow: number };
  narrative: {
    headline: string;
    trend: string;
    momentum: string;
    volatility: string;
    setup: string;
    checklist: string[];
    learning: LearningCard[];
  };
  series: { close: number; ema50: number | null; ema200: number | null }[];
  rsiSeries: (number | null)[];
  warnings: string[];
  disclaimer: string;
};

export class AnalysisInputError extends Error {
  readonly code: "invalid_bars" | "invalid_price" | "invalid_range";
  constructor(code: AnalysisInputError["code"], message: string) {
    super(message);
    this.name = "AnalysisInputError";
    this.code = code;
  }
}

/**
 * Turns a normalised screenshot series plus a price anchor into a full
 * educational analysis: EMA 50 / EMA 200 / RSI 14 / ATR 14 and a paper-trade plan.
 */
export function analyzeChart(input: AnalysisInput, now: Date = new Date()): AnalysisResult {
  const bars = input.bars ?? [];
  if (!Array.isArray(bars) || bars.length < 20) {
    throw new AnalysisInputError(
      "invalid_bars",
      "At least 20 detected price columns are needed to build an analysis.",
    );
  }
  if (!Number.isFinite(input.lastPrice) || input.lastPrice <= 0) {
    throw new AnalysisInputError("invalid_price", "Enter the last price shown on the chart.");
  }

  const lastPrice = input.lastPrice;
  const lastBar = bars[bars.length - 1];
  const lastNormalized = clamp01(lastBar.close);

  const hasRange =
    Number.isFinite(input.rangeHigh) &&
    Number.isFinite(input.rangeLow) &&
    (input.rangeHigh as number) > (input.rangeLow as number);

  let rangeLow: number;
  let rangeHigh: number;
  let mode: "user_range" | "estimated";
  const warnings: string[] = [];

  if (hasRange) {
    rangeLow = input.rangeLow as number;
    rangeHigh = input.rangeHigh as number;
    mode = "user_range";
  } else {
    // Map the screenshot's full vertical span to 4% of price, anchored so the
    // last detected column lands exactly on the price the user typed in.
    const span = lastPrice * 0.04;
    rangeLow = lastPrice - lastNormalized * span;
    rangeHigh = rangeLow + span;
    mode = "estimated";
  }

  const toPrice = (normalized: number) => rangeLow + clamp01(normalized) * (rangeHigh - rangeLow);

  const priceBars: OhlcBar[] = bars.map((bar) => {
    const values = [toPrice(bar.high), toPrice(bar.low), toPrice(bar.close)];
    const high = Math.max(...values);
    const low = Math.min(...values);
    return { high, low, close: toPrice(bar.close) };
  });

  const closes = priceBars.map((bar) => bar.close);
  const emaFastSeries = ema(closes, EMA_FAST_PERIOD);
  const emaSlowSeries = ema(closes, EMA_SLOW_PERIOD);
  const rsiSeries = rsi(closes, RSI_PERIOD);
  const atrSeries = atr(priceBars, ATR_PERIOD);

  const lastClose = closes[closes.length - 1];
  const ema50 = lastValue(emaFastSeries);
  const ema200 = lastValue(emaSlowSeries);
  const rsi14 = lastValue(rsiSeries);
  const atr14Raw = lastValue(atrSeries);

  const atr14 =
    atr14Raw !== null && atr14Raw > 0
      ? atr14Raw
      : Math.abs(lastClose) * 0.004 > 0
        ? Math.abs(lastClose) * 0.004
        : 1e-8;

  let trend: TrendBias;
  if (ema50 !== null && ema200 !== null) {
    const spread = (ema50 - ema200) / ema200;
    trend = spread > 0.0005 ? "up" : spread < -0.0005 ? "down" : "range";
  } else if (ema50 !== null) {
    trend = lastClose >= ema50 ? "up" : "down";
  } else {
    trend = lastClose >= closes[0] ? "up" : "down";
  }

  const momentum: AnalysisResult["indicators"]["momentum"] =
    rsi14 === null ? "neutral" : rsi14 >= 70 ? "overbought" : rsi14 <= 30 ? "oversold" : "neutral";

  const bias: TradeBias =
    trend === "up" ? "long" : trend === "down" ? "short" : rsi14 !== null && rsi14 >= 50 ? "long" : "short";

  const riskPerUnit = Math.max(atr14 * ATR_STOP_MULTIPLE, lastClose * 0.0015);
  const entry = lastClose;
  let stopLoss: number;
  let takeProfit: number;
  if (bias === "long") {
    stopLoss = entry - riskPerUnit;
    if (stopLoss <= 0) stopLoss = entry * 0.5;
    const risk = entry - stopLoss;
    takeProfit = entry + risk * REWARD_MULTIPLE;
  } else {
    stopLoss = entry + riskPerUnit;
    const risk = stopLoss - entry;
    takeProfit = Math.max(entry - risk * REWARD_MULTIPLE, entry * 0.01);
  }

  const actualRisk = Math.abs(entry - stopLoss);
  const actualReward = Math.abs(takeProfit - entry);
  const reference = swingLevels(priceBars, 12);

  const plan: TradePlan = {
    bias,
    entry,
    stopLoss,
    takeProfit,
    riskPerUnit: actualRisk,
    rewardPerUnit: actualReward,
    riskReward: actualRisk > 0 ? actualReward / actualRisk : 0,
    riskPercent: (actualRisk / entry) * 100,
    rewardPercent: (actualReward / entry) * 100,
  };

  if (mode === "user_range") {
    const mapped = toPrice(lastNormalized);
    if (Math.abs(mapped - lastPrice) / lastPrice > 0.03) {
      warnings.push(
        `Your last price (${formatPrice(lastPrice)}) is ${formatPercent(
          (Math.abs(mapped - lastPrice) / lastPrice) * 100,
          1,
        )} away from where the chart pixels map with the high/low you entered. Double-check the visible high and low.`,
      );
    }
  } else {
    warnings.push(
      "No visible high/low was entered, so the screenshot height was mapped to a 4% price band around your last price. Add the visible high and low for exact levels.",
    );
  }

  if (bars.length < EMA_SLOW_PERIOD) {
    warnings.push(
      `Only ${bars.length} price columns were detected. EMA 200 needs ${EMA_SLOW_PERIOD} columns to be fully formed, so read the long-term trend with care.`,
    );
  }
  if (input.chartType === "line") {
    warnings.push(
      "A line chart was detected, so ATR uses column-to-column movement instead of candle wicks. Candlestick screenshots give a truer volatility reading.",
    );
  }

  const narrative = buildNarrative({
    symbol: input.symbol,
    lastClose,
    ema50,
    ema200,
    rsi14,
    atr14,
    atrPercent: (atr14 / lastClose) * 100,
    trend,
    momentum,
    plan,
    bars: bars.length,
  });

  const stride = Math.max(1, Math.ceil(bars.length / 220));
  const series: AnalysisResult["series"] = [];
  const sampledRsi: (number | null)[] = [];
  for (let i = 0; i < bars.length; i += stride) {
    series.push({ close: closes[i], ema50: emaFastSeries[i], ema200: emaSlowSeries[i] });
    sampledRsi.push(rsiSeries[i]);
  }
  const lastIndex = bars.length - 1;
  if (series[series.length - 1]?.close !== closes[lastIndex]) {
    series.push({
      close: closes[lastIndex],
      ema50: emaFastSeries[lastIndex],
      ema200: emaSlowSeries[lastIndex],
    });
    sampledRsi.push(rsiSeries[lastIndex]);
  }

  return {
    symbol: (input.symbol ?? "").trim().toUpperCase() || "CHART",
    createdAt: now.toISOString(),
    bars: bars.length,
    chartType: input.chartType ?? "candles",
    scale: {
      mode,
      rangeHigh,
      rangeLow,
      priceSpan: rangeHigh - rangeLow,
      note:
        mode === "user_range"
          ? "Levels are mapped from the visible high and low you entered."
          : "Levels use an estimated 4% price band around your last price.",
    },
    lastClose,
    indicators: {
      ema50,
      ema200,
      rsi14,
      atr14,
      atrPercent: (atr14 / lastClose) * 100,
      trend,
      momentum,
    },
    plan,
    reference,
    narrative,
    series,
    rsiSeries: sampledRsi,
    warnings,
    disclaimer: DISCLAIMER,
  };
}

function buildNarrative(args: {
  symbol?: string | null;
  lastClose: number;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  atr14: number;
  atrPercent: number;
  trend: TrendBias;
  momentum: "overbought" | "oversold" | "neutral";
  plan: TradePlan;
  bars: number;
}): AnalysisResult["narrative"] {
  const { lastClose, ema50, ema200, rsi14, atr14, atrPercent, trend, momentum, plan } = args;
  const name = (args.symbol ?? "").trim().toUpperCase() || "This chart";

  const headline =
    trend === "up"
      ? "EMA 50 is above EMA 200 — the chart structure is bullish"
      : trend === "down"
        ? "EMA 50 is below EMA 200 — the chart structure is bearish"
        : "EMA 50 and EMA 200 are almost flat — no clear trend";

  const trendText =
    ema50 !== null && ema200 !== null
      ? `${name} closed at ${formatPrice(lastClose)} with EMA 50 at ${formatPrice(ema50)} and EMA 200 at ${formatPrice(
          ema200,
        )}. Because the 50-period average is ${ema50 >= ema200 ? "above" : "below"} the 200-period average, the screenshot is in a ${
          trend === "up" ? "short-term uptrend" : trend === "down" ? "short-term downtrend" : "sideways range"
        }. A 50/200 cross is the slowest, most filtered signal on the chart: it confirms direction, it does not time entries.`
      : `${name} closed at ${formatPrice(lastClose)}. EMA 200 is still forming because the screenshot holds only ${
          args.bars
        } columns — wait for a wider screenshot before trusting the long-term trend.`;

  const momentumText =
    rsi14 === null
      ? "RSI 14 needs at least 15 columns of price, so it is not available for this screenshot."
      : momentum === "overbought"
        ? `RSI 14 is ${rsi14.toFixed(1)} — above 70 means buyers have been aggressive for a while. In an uptrend that is strength, not an automatic sell, but it is a poor place to chase a new entry because the stop has to sit far away.`
        : momentum === "oversold"
          ? `RSI 14 is ${rsi14.toFixed(1)} — below 30 means sellers have been aggressive for a while. Watch for a stall or a reclaim of the EMA 50 instead of catching a falling chart.`
          : `RSI 14 is ${rsi14.toFixed(1)} — the middle of the range. Momentum is neither stretched up nor down, so the EMA structure should carry more weight than RSI here.`;

  const volatilityText = `ATR 14 is ${formatPrice(atr14)} (${formatPercent(
    atrPercent,
  )} of price). That is the average distance price travels per column, so it sets a sane stop distance: a stop closer than one ATR is usually noise, and a target closer than two ATRs rarely pays for the risk.`;

  const setupText =
    plan.bias === "long"
      ? `Practice plan (long): entry near ${formatPrice(plan.entry)}, stop ${formatPrice(
          plan.stopLoss,
        )} (${formatPercent(plan.riskPercent)} risk, ${ATR_STOP_MULTIPLE}× ATR below entry), target ${formatPrice(
          plan.takeProfit,
        )} (${formatPercent(plan.rewardPercent)} reward). That is a ${plan.riskReward.toFixed(
          1,
        )}:1 reward-to-risk ratio, so two losses cost about one winner.`
      : `Practice plan (short): entry near ${formatPrice(plan.entry)}, stop ${formatPrice(
          plan.stopLoss,
        )} (${formatPercent(plan.riskPercent)} risk, ${ATR_STOP_MULTIPLE}× ATR above entry), target ${formatPrice(
          plan.takeProfit,
        )} (${formatPercent(plan.rewardPercent)} reward). That is a ${plan.riskReward.toFixed(
          1,
        )}:1 reward-to-risk ratio, so two losses cost about one winner.`;

  const checklist = [
    `Wait for a column to close ${plan.bias === "long" ? "above" : "below"} the EMA 50 before you act — intra-column pokes reverse often.`,
    momentum === "overbought" || momentum === "oversold"
      ? `RSI is ${momentum}: let it cool back toward 50 before adding a new practice trade.`
      : "RSI is mid-range: momentum agrees with a trend-following entry.",
    `Size the paper position so the distance to ${formatPrice(plan.stopLoss)} is at most 1–2% of your practice balance.`,
    `If price reaches ${formatPrice(plan.takeProfit)}, take the practice profit instead of moving the target.`,
    "If the plan is wrong twice in a row, stop and re-check the higher-timeframe chart instead of averaging down.",
    "Screenshot analysis cannot see volume, news or the wider market — always zoom out before trading.",
  ];

  const learning: LearningCard[] = [
    {
      title: "EMA 50 — the short-term trend",
      body: "An exponential moving average of the last 50 columns, weighted toward recent price. It reacts faster than EMA 200, so traders use it as a dynamic support/resistance line in the direction of the trend.",
    },
    {
      title: "EMA 200 — the long-term trend",
      body: "A slower average of 200 columns. Price above EMA 200 is generally a bull structure, price below is a bear structure. The gap between EMA 50 and EMA 200 shows how stretched the trend is.",
    },
    {
      title: "RSI 14 — momentum",
      body: "The Relative Strength Index compares average gains with average losses over 14 columns, scaled 0–100. Above 70 is overbought, below 30 is oversold, and 50 is neutral. It measures speed, not direction.",
    },
    {
      title: "ATR 14 — volatility",
      body: "Average True Range is the mean size of a column including its wicks. It does not point up or down; it tells you how far price usually moves, which is exactly what a stop-loss distance should be based on.",
    },
    {
      title: "Entry, stop and target",
      body: `The stop sits ${ATR_STOP_MULTIPLE}× ATR away so ordinary noise does not close the trade, and the target sits ${REWARD_MULTIPLE}× the risk away so the maths works even with a modest win rate. This is a practice template, not a prediction.`,
    },
  ];

  return {
    headline,
    trend: trendText,
    momentum: momentumText,
    volatility: volatilityText,
    setup: setupText,
    checklist,
    learning,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
