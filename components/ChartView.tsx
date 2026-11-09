import { formatPrice } from "@/lib/format";
import type { TradePlan } from "@/lib/analysis";

type Point = { close: number; ema50: number | null; ema200: number | null };

function linePath(points: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let path = "";
  let drawing = false;
  points.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      drawing = false;
      return;
    }
    const command = drawing ? "L" : "M";
    path += `${command}${x(index).toFixed(2)} ${y(value).toFixed(2)} `;
    drawing = true;
  });
  return path.trim();
}

export function ChartView({
  series,
  plan,
}: {
  series: Point[];
  plan: TradePlan;
}) {
  if (series.length < 2) return null;

  const width = 720;
  const height = 300;
  const closes = series.map((point) => point.close);
  const ema50 = series.map((point) => point.ema50);
  const ema200 = series.map((point) => point.ema200);

  const all = [
    ...closes,
    ...ema50.filter((value): value is number => value !== null),
    ...ema200.filter((value): value is number => value !== null),
    plan.entry,
    plan.stopLoss,
    plan.takeProfit,
  ].filter((value) => Number.isFinite(value));

  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const padding = Math.max((rawMax - rawMin) * 0.08, rawMax * 0.0005, 1e-9);
  const min = rawMin - padding;
  const max = rawMax + padding;

  const x = (index: number) => (index / (series.length - 1)) * width;
  const y = (value: number) => height - ((value - min) / (max - min)) * height;

  const levels = [
    { label: "Entry", value: plan.entry, color: "#c084fc" },
    { label: "Stop", value: plan.stopLoss, color: "#fb7185" },
    { label: "Target", value: plan.takeProfit, color: "#34d399" },
  ];

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-black/45 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-violet-300/65">
        <span>Reconstructed chart</span>
        <span className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <i className="h-1.5 w-4 rounded-full bg-violet-300" /> Price
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-1.5 w-4 rounded-full bg-emerald-400" /> EMA 50
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-1.5 w-4 rounded-full bg-fuchsia-400" /> EMA 200
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Chart with price, EMA 50, EMA 200, entry ${formatPrice(plan.entry)}, stop ${formatPrice(
          plan.stopLoss,
        )} and target ${formatPrice(plan.takeProfit)}`}
      >
        <defs>
          <linearGradient id="chartPrice" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ede9fe" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={width}
            y1={height * ratio}
            y2={height * ratio}
            stroke="rgba(168,85,247,0.16)"
            strokeWidth="1"
          />
        ))}

        {levels.map((level) => (
          <g key={level.label}>
            <line
              x1={0}
              x2={width}
              y1={y(level.value)}
              y2={y(level.value)}
              stroke={level.color}
              strokeWidth="1.2"
              strokeDasharray="6 5"
              opacity="0.85"
            />
            <text x={6} y={Math.max(12, y(level.value) - 5)} fill={level.color} fontSize="11">
              {level.label} {formatPrice(level.value)}
            </text>
          </g>
        ))}

        <path d={linePath(closes, x, y)} fill="none" stroke="url(#chartPrice)" strokeWidth="2.1" strokeLinejoin="round" />
        <path d={linePath(ema50, x, y)} fill="none" stroke="#34d399" strokeWidth="1.5" opacity="0.95" />
        <path d={linePath(ema200, x, y)} fill="none" stroke="#f0abfc" strokeWidth="1.5" opacity="0.85" />
      </svg>
    </div>
  );
}
