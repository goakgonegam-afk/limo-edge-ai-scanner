import type { ChartType, NormalizedBar } from "./types";

export type ExtractionErrorCode = "invalid_image" | "too_small" | "no_chart";

export class ChartExtractionError extends Error {
  readonly code: ExtractionErrorCode;
  constructor(code: ExtractionErrorCode, message: string) {
    super(message);
    this.name = "ChartExtractionError";
    this.code = code;
  }
}

export type ExtractedChart = {
  bars: NormalizedBar[];
  chartType: ChartType;
  width: number;
  height: number;
  inkRatio: number;
  gapColumns: number;
};

type Cluster = { top: number; bottom: number; centroid: number; count: number };

export const MIN_BARS = 20;

/**
 * Rebuilds a price series out of a chart screenshot.
 *
 * The algorithm is intentionally provider agnostic:
 *  1. Estimate the page background from the border ring (dark or light theme).
 *  2. Mark "ink" pixels: pixels that stand out from the background or are strongly saturated.
 *  3. Drop full-width/full-height ink runs, which are grid lines and axes.
 *  4. Group ink rows per column into clusters, then walk left/right from a seed column
 *     following the cluster closest to the previous one. This keeps the price path and
 *     ignores toolbars, watermarks, legends and volume sub-panels.
 *  5. Normalise each followed cluster into a bar (wick high/low + body centre as close).
 */
export function extractChartSeries(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
): ExtractedChart {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < MIN_BARS || height < MIN_BARS) {
    throw new ChartExtractionError("too_small", "That image is too small to read a chart from.");
  }
  if (!pixels || pixels.length < width * height * 4) {
    throw new ChartExtractionError("invalid_image", "The image data could not be read.");
  }

  const total = width * height;
  const lum = new Float32Array(total);
  const sat = new Float32Array(total);

  for (let i = 0, p = 0; i < total; i++, p += 4) {
    const r = pixels[p];
    const g = pixels[p + 1];
    const b = pixels[p + 2];
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    sat[i] = mx === 0 ? 0 : (mx - mn) / mx;
  }

  const border: number[] = [];
  for (let x = 0; x < width; x++) {
    border.push(lum[x], lum[(height - 1) * width + x]);
  }
  for (let y = 0; y < height; y++) {
    border.push(lum[y * width], lum[y * width + width - 1]);
  }
  const bg = median(border);
  const darkTheme = bg < 128;

  const buildMask = (threshold: number) => {
    const mask = new Uint8Array(total);
    let count = 0;
    for (let i = 0; i < total; i++) {
      const delta = darkTheme ? lum[i] - bg : bg - lum[i];
      // Saturated colours (green/red/purple candles) count even when the
      // luminance contrast against the background is low.
      const score = sat[i] > 0.45 ? delta + 12 : delta;
      if (score >= threshold) {
        mask[i] = 1;
        count++;
      }
    }
    return { mask, count };
  };

  let threshold = 32;
  let built = buildMask(threshold);
  const minInk = Math.max(64, total * 0.0015);
  if (built.count < minInk) {
    threshold = 20;
    built = buildMask(threshold);
  }
  if (built.count < minInk) {
    throw new ChartExtractionError(
      "no_chart",
      "No price line or candles were detected. Crop the screenshot to the chart area and try again.",
    );
  }

  const { mask } = built;
  const rowCount = new Int32Array(height);
  const colCount = new Int32Array(width);
  for (let y = 0; y < height; y++) {
    const off = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[off + x]) {
        rowCount[y]++;
        colCount[x]++;
      }
    }
  }

  // Grid lines / axis rules span almost the whole image: remove them.
  for (let y = 0; y < height; y++) {
    if (rowCount[y] > width * 0.7) {
      const off = y * width;
      for (let x = 0; x < width; x++) mask[off + x] = 0;
    }
  }
  for (let x = 0; x < width; x++) {
    if (colCount[x] > height * 0.7) {
      for (let y = 0; y < height; y++) mask[y * width + x] = 0;
    }
  }

  const gapTolerance = Math.max(1, Math.round(height * 0.004));
  const clustersByColumn: Cluster[][] = new Array(width);
  for (let x = 0; x < width; x++) {
    const clusters: Cluster[] = [];
    let top = -1;
    let bottom = -1;
    let sum = 0;
    let count = 0;
    for (let y = 0; y < height; y++) {
      if (!mask[y * width + x]) continue;
      if (top === -1) {
        top = y;
        bottom = y;
        sum = y;
        count = 1;
      } else if (y - bottom <= gapTolerance) {
        bottom = y;
        sum += y;
        count++;
      } else {
        clusters.push({ top, bottom, centroid: sum / count, count });
        top = y;
        bottom = y;
        sum = y;
        count = 1;
      }
    }
    if (top !== -1) clusters.push({ top, bottom, centroid: sum / count, count });
    clustersByColumn[x] = clusters;
  }

  // Seed: the cluster closest to the vertical centre inside the middle band of the image.
  const seedTarget = height * 0.45;
  let seedX = -1;
  let seedCluster: Cluster | null = null;
  let seedScore = Infinity;
  const from = Math.floor(width * 0.3);
  const to = Math.ceil(width * 0.7);
  for (let x = from; x <= to && x < width; x++) {
    for (const cluster of clustersByColumn[x]) {
      if (cluster.count < 2) continue;
      const score = Math.abs(cluster.centroid - seedTarget) - Math.min(cluster.count, 60) * 0.05;
      if (score < seedScore) {
        seedScore = score;
        seedX = x;
        seedCluster = cluster;
      }
    }
  }
  if (seedX === -1 || !seedCluster) {
    for (let x = 0; x < width && seedX === -1; x++) {
      for (const cluster of clustersByColumn[x]) {
        if (cluster.count >= 2) {
          seedX = x;
          seedCluster = cluster;
          break;
        }
      }
    }
  }
  if (seedX === -1 || !seedCluster) {
    throw new ChartExtractionError(
      "no_chart",
      "No continuous price path was found in the screenshot. Try a tighter crop of the chart.",
    );
  }

  const chosen: (Cluster | null)[] = new Array(width).fill(null);
  chosen[seedX] = seedCluster;
  const maxJump = Math.max(8, height * 0.3);

  const pickNearest = (clusters: Cluster[], target: number): Cluster | null => {
    let best: Cluster | null = null;
    let bestDistance = Infinity;
    for (const cluster of clusters) {
      const distance = Math.abs(cluster.centroid - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = cluster;
      }
    }
    return best && bestDistance <= maxJump ? best : null;
  };

  let previous = seedCluster.centroid;
  for (let x = seedX + 1; x < width; x++) {
    const next = pickNearest(clustersByColumn[x], previous);
    chosen[x] = next;
    if (next) previous = next.centroid;
  }
  previous = seedCluster.centroid;
  for (let x = seedX - 1; x >= 0; x--) {
    const next = pickNearest(clustersByColumn[x], previous);
    chosen[x] = next;
    if (next) previous = next.centroid;
  }

  let first = 0;
  while (first < width && !chosen[first]) first++;
  let last = width - 1;
  while (last >= 0 && !chosen[last]) last--;
  if (first >= last || last - first + 1 < MIN_BARS) {
    throw new ChartExtractionError(
      "no_chart",
      "The chart was too narrow to read. Upload a wider screenshot of the price chart.",
    );
  }

  let gapColumns = 0;
  for (let x = first; x <= last; x++) {
    if (!chosen[x]) {
      gapColumns++;
      let left = x - 1;
      while (left >= first && !chosen[left]) left--;
      let right = x + 1;
      while (right <= last && !chosen[right]) right++;
      const leftCluster = left >= first ? (chosen[left] as Cluster) : null;
      const rightCluster = right <= last ? (chosen[right] as Cluster) : null;
      if (leftCluster && rightCluster) {
        const ratio = (x - left) / (right - left);
        chosen[x] = {
          top: leftCluster.top + (rightCluster.top - leftCluster.top) * ratio,
          bottom: leftCluster.bottom + (rightCluster.bottom - leftCluster.bottom) * ratio,
          centroid:
            leftCluster.centroid + (rightCluster.centroid - leftCluster.centroid) * ratio,
          count: 0,
        };
      } else {
        chosen[x] = leftCluster ?? rightCluster;
      }
    }
  }

  const spans: number[] = [];
  for (let x = first; x <= last; x++) {
    const cluster = chosen[x] as Cluster;
    if (cluster.count > 0) spans.push(cluster.bottom - cluster.top);
  }
  const chartType: ChartType = spans.length > 0 && median(spans) <= 3.5 ? "line" : "candles";

  const maxY = Math.max(1, height - 1);
  const bars: NormalizedBar[] = [];
  for (let x = first; x <= last; x++) {
    const cluster = chosen[x] as Cluster;
    const high = clamp01(1 - cluster.top / maxY);
    const low = clamp01(1 - cluster.bottom / maxY);
    const close = clamp01(1 - cluster.centroid / maxY);
    bars.push({
      high: Math.max(high, low, close),
      low: Math.min(high, low, close),
      close,
    });
  }

  return {
    bars,
    chartType,
    width,
    height,
    inkRatio: built.count / total,
    gapColumns,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
