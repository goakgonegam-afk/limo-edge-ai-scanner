import { describe, expect, it } from "vitest";
import { atr, ema, lastValue, rsi, sma, swingLevels } from "@/lib/indicators";

describe("moving averages", () => {
  it("sma leaves the warm-up window empty", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBeCloseTo(2, 10);
    expect(out[4]).toBeCloseTo(4, 10);
  });

  it("ema of a constant series equals that constant", () => {
    const out = ema(new Array(60).fill(42), 50);
    expect(lastValue(out)).toBeCloseTo(42, 8);
  });

  it("ema follows a rising series upward", () => {
    const values = Array.from({ length: 120 }, (_, i) => 100 + i);
    const fast = lastValue(ema(values, 50));
    const slow = lastValue(ema(values, 200));
    expect(fast).not.toBeNull();
    expect(fast as number).toBeGreaterThan(150);
    // EMA 200 is not fully formed on 120 points, but must still trail the fast EMA.
    if (slow !== null) expect(slow).toBeLessThan(fast as number);
  });
});

describe("rsi", () => {
  it("returns 100 for an unbroken advance", () => {
    const values = Array.from({ length: 40 }, (_, i) => 10 + i);
    expect(lastValue(rsi(values, 14))).toBeCloseTo(100, 6);
  });

  it("returns 0 for an unbroken decline", () => {
    const values = Array.from({ length: 40 }, (_, i) => 100 - i);
    expect(lastValue(rsi(values, 14))).toBeCloseTo(0, 6);
  });

  it("stays inside 0..100 for mixed data", () => {
    const values = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 3) * 8);
    const series = rsi(values, 14);
    for (const value of series) {
      if (value === null) continue;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe("atr", () => {
  it("is positive and reflects bar range", () => {
    const bars = Array.from({ length: 40 }, (_, i) => ({
      high: 110 + i * 0.1,
      low: 100 + i * 0.1,
      close: 105 + i * 0.1,
    }));
    const value = lastValue(atr(bars, 14));
    expect(value).not.toBeNull();
    expect(value as number).toBeGreaterThan(0);
    expect(value as number).toBeLessThanOrEqual(10.0001);
  });

  it("has no value before the warm-up window", () => {
    const bars = Array.from({ length: 10 }, () => ({ high: 2, low: 1, close: 1.5 }));
    expect(atr(bars, 14).every((value) => value === null)).toBe(true);
  });
});

describe("swingLevels", () => {
  it("keeps the swing high and low inside the observed range", () => {
    const bars = [
      { high: 5, low: 1, close: 2 },
      { high: 9, low: 3, close: 8 },
      { high: 4, low: 2, close: 3 },
    ];
    const { swingHigh, swingLow } = swingLevels(bars, 12);
    expect(swingHigh).toBe(9);
    expect(swingLow).toBe(1);
  });
});
