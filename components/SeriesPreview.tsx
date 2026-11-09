import type { NormalizedBar } from "@/lib/types";

/** Mini preview of the price path recovered from the screenshot pixels. */
export function SeriesPreview({ bars, chartType }: { bars: NormalizedBar[]; chartType: string }) {
  if (bars.length < 2) return null;
  const width = 480;
  const height = 120;
  const points = bars.map((bar, index) => {
    const x = (index / (bars.length - 1)) * width;
    const y = height - bar.close * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <div className="rounded-xl border border-violet-400/20 bg-black/45 p-3">
      <div className="flex items-center justify-between text-[0.68rem] uppercase tracking-[0.14em] text-violet-300/65">
        <span>Detected price path</span>
        <span>
          {bars.length} columns · {chartType}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Detected price path from the screenshot"
      >
        <defs>
          <linearGradient id="previewStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="url(#previewStroke)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
