import type { ChartType, NormalizedBar } from "./types";

export type ParsedAnalysisRequest = {
  symbol: string;
  lastPrice: number;
  rangeHigh: number | null;
  rangeLow: number | null;
  chartType: ChartType;
  bars: NormalizedBar[];
};

export class RequestValidationError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestValidationError";
    this.status = status;
  }
}

const MAX_BARS = 4000;
const MIN_BARS = 20;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function optionalPositive(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new RequestValidationError(`${label} must be a positive number.`);
  }
  return parsed;
}

/** Validates the client's analysis payload before any indicator work runs. */
export function parseAnalysisRequest(body: unknown): ParsedAnalysisRequest {
  if (!body || typeof body !== "object") {
    throw new RequestValidationError("Send a JSON body with the chart columns.");
  }
  const raw = body as Record<string, unknown>;

  if (!Array.isArray(raw.bars)) {
    throw new RequestValidationError("No chart columns were detected in that screenshot.");
  }
  if (raw.bars.length < MIN_BARS) {
    throw new RequestValidationError(
      `At least ${MIN_BARS} price columns are needed — crop the screenshot tighter around the candles.`,
    );
  }
  if (raw.bars.length > MAX_BARS) {
    throw new RequestValidationError("That screenshot produced too many columns to analyse.");
  }

  const bars: NormalizedBar[] = raw.bars.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new RequestValidationError("Malformed chart columns in the request.");
    }
    const bar = entry as Record<string, unknown>;
    const high = Number(bar.high);
    const low = Number(bar.low);
    const close = Number(bar.close);
    if (![high, low, close].every((value) => Number.isFinite(value))) {
      throw new RequestValidationError("Malformed chart columns in the request.");
    }
    const h = clamp01(high);
    const l = clamp01(low);
    const c = clamp01(close);
    return { high: Math.max(h, l, c), low: Math.min(h, l, c), close: c };
  });

  const lastPrice = Number(raw.lastPrice);
  if (!Number.isFinite(lastPrice) || lastPrice <= 0 || lastPrice > 1e12) {
    throw new RequestValidationError("Enter the last price shown on the chart.");
  }

  const rangeHigh = optionalPositive(raw.rangeHigh, "The visible high");
  const rangeLow = optionalPositive(raw.rangeLow, "The visible low");
  if (rangeHigh !== null && rangeLow !== null && rangeHigh <= rangeLow) {
    throw new RequestValidationError("The visible high must be above the visible low.");
  }

  const symbol =
    typeof raw.symbol === "string"
      ? raw.symbol
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9._/-]/g, "")
          .slice(0, 20)
      : "";

  const chartType: ChartType = raw.chartType === "line" ? "line" : "candles";

  return { symbol, lastPrice, rangeHigh, rangeLow, chartType, bars };
}
