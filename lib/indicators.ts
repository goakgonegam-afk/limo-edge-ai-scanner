export type OhlcBar = { high: number; low: number; close: number };

/**
 * Simple moving average. Values before the first full window are `null`.
 */
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Exponential moving average seeded with the SMA of the first `period` values
 * (the convention used by most charting platforms).
 */
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  seed /= period;
  out[period - 1] = seed;
  for (let i = period; i < values.length; i++) {
    const prev = out[i - 1] as number;
    out[i] = values[i] * k + prev * (1 - k);
  }
  return out;
}

/**
 * Relative Strength Index using Wilder's smoothing.
 * A series with no losses returns 100, a series with no gains returns 0.
 */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum -= change;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = rsiFromAverages(avgGain, avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = rsiFromAverages(avgGain, avgLoss);
  }
  return out;
}

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  if (avgGain === 0) return 0;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Average True Range using Wilder's smoothing.
 */
export function atr(bars: OhlcBar[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  if (period <= 0 || bars.length < period) return out;

  const trueRanges: number[] = new Array(bars.length).fill(0);
  trueRanges[0] = bars[0].high - bars[0].low;
  for (let i = 1; i < bars.length; i++) {
    const prevClose = bars[i - 1].close;
    trueRanges[i] = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prevClose),
      Math.abs(bars[i].low - prevClose),
    );
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trueRanges[i];
  let current = sum / period;
  out[period - 1] = current;
  for (let i = period; i < bars.length; i++) {
    current = (current * (period - 1) + trueRanges[i]) / period;
    out[i] = current;
  }
  return out;
}

/** Last non-null value of an indicator series. */
export function lastValue<T>(series: (T | null)[]): T | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/** Highest high / lowest low over the final `lookback` bars. */
export function swingLevels(bars: OhlcBar[], lookback = 12): { swingHigh: number; swingLow: number } {
  const window = bars.slice(Math.max(0, bars.length - lookback));
  let swingHigh = -Infinity;
  let swingLow = Infinity;
  for (const bar of window) {
    if (bar.high > swingHigh) swingHigh = bar.high;
    if (bar.low < swingLow) swingLow = bar.low;
  }
  if (!Number.isFinite(swingHigh) || !Number.isFinite(swingLow)) {
    return { swingHigh: 0, swingLow: 0 };
  }
  return { swingHigh, swingLow };
}
