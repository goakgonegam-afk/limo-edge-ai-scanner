export type ChartType = "candles" | "line";

/**
 * A bar derived from a chart screenshot.
 * Values are normalised to the image: 1 = top of the picture, 0 = bottom.
 */
export type NormalizedBar = { high: number; low: number; close: number };
