import { describe, expect, it } from "vitest";
import { ChartExtractionError, MIN_BARS, extractChartSeries } from "@/lib/extraction";

type Rgb = [number, number, number];

function blankCanvas(width: number, height: number, color: Rgb) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = 255;
  }
  return data;
}

function paint(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  yFrom: number,
  yTo: number,
  color: Rgb,
  thickness = 3,
) {
  for (let dy = yFrom; dy <= yTo; dy++) {
    for (let dx = 0; dx < thickness; dx++) {
      const px = x + dx;
      const index = (dy * width + px) * 4;
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255;
    }
  }
}

/** Draws a synthetic uptrend chart on a dark theme, inset so the border stays background. */
function syntheticChart(width = 520, height = 300): Uint8ClampedArray {
  const data = blankCanvas(width, height, [16, 14, 22]);
  const candle = 3;
  const gap = 2;
  const margin = 24;
  const green: Rgb = [70, 210, 130];
  const columns = Math.floor((width - margin * 2) / (candle + gap));
  for (let c = 0; c < columns; c++) {
    const progress = c / (columns - 1);
    const centre = height - margin - progress * (height - margin * 2 - 40) - 20;
    const body = 26 + (c % 5) * 3;
    const top = Math.round(centre - body / 2);
    const bottom = Math.round(centre + body / 2);
    paint(data, width, margin + c * (candle + gap), top, bottom, green, candle);
  }
  return data;
}

describe("extractChartSeries", () => {
  it("recovers a price path from a dark-theme candlestick screenshot", () => {
    const width = 520;
    const height = 300;
    const chart = extractChartSeries(syntheticChart(width, height), width, height);

    expect(chart.bars.length).toBeGreaterThanOrEqual(MIN_BARS);
    expect(chart.width).toBe(width);
    expect(chart.height).toBe(height);
    expect(chart.inkRatio).toBeGreaterThan(0);
    expect(["candles", "line"]).toContain(chart.chartType);

    for (const bar of chart.bars) {
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      expect(bar.low).toBeGreaterThanOrEqual(0);
      expect(bar.high).toBeLessThanOrEqual(1);
      expect(Number.isFinite(bar.close)).toBe(true);
    }

    // The drawn series rises from bottom to top of the image, so normalised
    // values (1 = top) must rise as well.
    expect(chart.bars[chart.bars.length - 1].close).toBeGreaterThan(chart.bars[0].close);
  });

  it("rejects an image with no chart ink", () => {
    const width = 300;
    const height = 200;
    const flat = blankCanvas(width, height, [18, 16, 24]);
    expect(() => extractChartSeries(flat, width, height)).toThrow(ChartExtractionError);
    try {
      extractChartSeries(flat, width, height);
    } catch (error) {
      expect((error as ChartExtractionError).code).toBe("no_chart");
    }
  });

  it("rejects an image that is too small", () => {
    const data = blankCanvas(8, 8, [18, 16, 24]);
    expect(() => extractChartSeries(data, 8, 8)).toThrow(ChartExtractionError);
  });

  it("rejects mismatched pixel buffers", () => {
    expect(() => extractChartSeries(new Uint8ClampedArray(16), 200, 200)).toThrow(ChartExtractionError);
  });
});
