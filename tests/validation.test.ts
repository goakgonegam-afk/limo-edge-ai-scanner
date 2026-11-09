import { describe, expect, it } from "vitest";
import { parseAnalysisRequest, RequestValidationError } from "@/lib/validation";
import type { NormalizedBar } from "@/lib/types";

const bars: NormalizedBar[] = Array.from({ length: 40 }, (_, i) => ({
  high: 0.5 + i * 0.005,
  low: 0.4 + i * 0.005,
  close: 0.45 + i * 0.005,
}));

const valid = {
  symbol: "btc/usdt!",
  lastPrice: 64000,
  rangeHigh: 68000,
  rangeLow: 60000,
  chartType: "candles",
  bars,
};

describe("parseAnalysisRequest", () => {
  it("accepts a well formed payload and sanitises the symbol", () => {
    const parsed = parseAnalysisRequest(valid);
    expect(parsed.symbol).toBe("BTC/USDT");
    expect(parsed.lastPrice).toBe(64000);
    expect(parsed.bars).toHaveLength(40);
    expect(parsed.chartType).toBe("candles");
  });

  it("clamps bars into the 0..1 normalised space and orders high/low", () => {
    const parsed = parseAnalysisRequest({
      ...valid,
      bars: [{ high: 1.4, low: -0.2, close: 0.5 }, ...bars.slice(1)],
    });
    expect(parsed.bars[0].high).toBe(1);
    expect(parsed.bars[0].low).toBe(0);
    expect(parsed.bars[0].high).toBeGreaterThanOrEqual(parsed.bars[0].close);
  });

  it("rejects too few columns", () => {
    expect(() => parseAnalysisRequest({ ...valid, bars: bars.slice(0, 5) })).toThrow(RequestValidationError);
  });

  it("rejects a missing or non-positive price", () => {
    expect(() => parseAnalysisRequest({ ...valid, lastPrice: 0 })).toThrow(RequestValidationError);
    expect(() => parseAnalysisRequest({ ...valid, lastPrice: "abc" })).toThrow(RequestValidationError);
  });

  it("rejects an inverted visible range", () => {
    expect(() => parseAnalysisRequest({ ...valid, rangeHigh: 50000, rangeLow: 60000 })).toThrow(
      RequestValidationError,
    );
  });

  it("rejects malformed bar entries", () => {
    expect(() => parseAnalysisRequest({ ...valid, bars: [{ high: "x" }, ...bars.slice(1)] })).toThrow(
      RequestValidationError,
    );
    expect(() => parseAnalysisRequest({ ...valid, bars: "nope" })).toThrow(RequestValidationError);
  });

  it("defaults the chart type to candles", () => {
    expect(parseAnalysisRequest({ ...valid, chartType: "weird" }).chartType).toBe("candles");
    expect(parseAnalysisRequest({ ...valid, chartType: "line" }).chartType).toBe("line");
  });
});
