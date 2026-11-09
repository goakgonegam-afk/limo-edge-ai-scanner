import { describe, expect, it } from "vitest";
import { analyzeChart, AnalysisInputError, type AnalysisInput } from "@/lib/analysis";
import type { NormalizedBar } from "@/lib/types";

function trendBars(count: number, from: number, to: number): NormalizedBar[] {
  return Array.from({ length: count }, (_, i) => {
    const mid = from + ((to - from) * i) / (count - 1);
    return { high: Math.min(1, mid + 0.01), low: Math.max(0, mid - 0.01), close: mid };
  });
}

const baseInput: AnalysisInput = {
  symbol: "btcusdt",
  lastPrice: 100,
  rangeHigh: 120,
  rangeLow: 80,
  chartType: "candles",
  bars: trendBars(260, 0.2, 0.9),
};

describe("analyzeChart", () => {
  it("computes EMA 50, EMA 200, RSI 14 and ATR 14", () => {
    const result = analyzeChart(baseInput, new Date("2026-01-01T00:00:00Z"));
    expect(result.indicators.ema50).not.toBeNull();
    expect(result.indicators.ema200).not.toBeNull();
    expect(result.indicators.rsi14).not.toBeNull();
    expect(result.indicators.atr14).not.toBeNull();
    expect(result.indicators.rsi14 as number).toBeGreaterThanOrEqual(0);
    expect(result.indicators.rsi14 as number).toBeLessThanOrEqual(100);
    expect(result.indicators.atr14 as number).toBeGreaterThan(0);
    expect(result.bars).toBe(260);
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("produces a long plan with entry between stop and target on an uptrend", () => {
    const { plan, indicators, lastClose } = analyzeChart(baseInput);
    expect(indicators.trend).toBe("up");
    expect(plan.bias).toBe("long");
    // With an entered high/low the entry is the mapped last close, inside that range.
    expect(plan.entry).toBeCloseTo(lastClose, 10);
    expect(plan.entry).toBeGreaterThan(80);
    expect(plan.entry).toBeLessThan(120);
    expect(plan.stopLoss).toBeLessThan(plan.entry);
    expect(plan.takeProfit).toBeGreaterThan(plan.entry);
    expect(plan.riskReward).toBeCloseTo(2, 6);
    expect(plan.riskPercent).toBeGreaterThan(0);
  });

  it("mirrors the levels for a downtrend", () => {
    const { plan, indicators } = analyzeChart({ ...baseInput, bars: trendBars(260, 0.9, 0.2) });
    expect(indicators.trend).toBe("down");
    expect(plan.bias).toBe("short");
    expect(plan.stopLoss).toBeGreaterThan(plan.entry);
    expect(plan.takeProfit).toBeLessThan(plan.entry);
  });

  it("maps the pixels through the entered high and low", () => {
    const result = analyzeChart(baseInput);
    expect(result.scale.mode).toBe("user_range");
    expect(result.scale.rangeHigh).toBe(120);
    expect(result.scale.rangeLow).toBe(80);
    expect(result.lastClose).toBeGreaterThan(80);
    expect(result.lastClose).toBeLessThan(120);
  });

  it("falls back to an estimated band and warns when no range is given", () => {
    const result = analyzeChart({ ...baseInput, rangeHigh: null, rangeLow: null });
    expect(result.scale.mode).toBe("estimated");
    expect(result.warnings.join(" ")).toContain("No visible high/low");
    expect(result.scale.priceSpan).toBeGreaterThan(0);
  });

  it("keeps the educational disclaimer and learning cards", () => {
    const result = analyzeChart(baseInput);
    expect(result.disclaimer.toLowerCase()).toContain("paper-trading");
    expect(result.narrative.learning.length).toBeGreaterThan(0);
    expect(result.narrative.checklist.length).toBeGreaterThan(0);
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.rsiSeries.length).toBe(result.series.length);
  });

  it("rejects too few columns and a missing price", () => {
    expect(() => analyzeChart({ ...baseInput, bars: trendBars(10, 0.2, 0.8) })).toThrow(AnalysisInputError);
    expect(() => analyzeChart({ ...baseInput, lastPrice: 0 })).toThrow(AnalysisInputError);
  });
});
