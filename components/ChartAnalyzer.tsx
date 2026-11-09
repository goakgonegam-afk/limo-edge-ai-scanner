"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/analysis";
import { ChartExtractionError, extractChartSeries, type ExtractedChart } from "@/lib/extraction";
import { AnalysisReport } from "./AnalysisReport";
import { SeriesPreview } from "./SeriesPreview";

const MAX_WIDTH = 1500;

type Loaded = { chart: ExtractedChart; previewUrl: string; fileName: string };

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("That image could not be opened. Try a PNG or JPG screenshot of the chart."));
    image.src = src;
  });
}

export function ChartAnalyzer({ hasAccess }: { hasAccess: boolean }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [symbol, setSymbol] = useState("");
  const [lastPrice, setLastPrice] = useState("");
  const [rangeHigh, setRangeHigh] = useState("");
  const [rangeLow, setRangeLow] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    setLocked(false);

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file. iPhone HEIC photos need exporting as JPG first.");
      return;
    }

    setBusy(true);
    setStatus("Reading the screenshot pixels…");
    try {
      const url = URL.createObjectURL(file);
      const image = await loadImage(url);
      const scale = Math.min(1, MAX_WIDTH / Math.max(1, image.naturalWidth));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("This browser blocked canvas reading. Try a different browser.");
      context.drawImage(image, 0, 0, width, height);
      const data = context.getImageData(0, 0, width, height);
      const chart = extractChartSeries(data.data, width, height);

      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = url;

      setLoaded({ chart, previewUrl: url, fileName: file.name });
      setStatus(
        `Detected ${chart.bars.length} price columns (${chart.chartType}). Add the price from the chart, then run the analysis.`,
      );
    } catch (caught) {
      const message =
        caught instanceof ChartExtractionError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Could not read that screenshot.";
      setError(message);
      setStatus(null);
      setLoaded(null);
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  async function runAnalysis(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded) {
      setError("Upload a chart screenshot first.");
      return;
    }

    const price = Number(lastPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter the last price shown on the chart.");
      return;
    }

    setBusy(true);
    setError(null);
    setStatus("Calculating EMA 50, EMA 200, RSI 14 and ATR 14…");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          lastPrice: price,
          rangeHigh: rangeHigh.trim() === "" ? null : Number(rangeHigh),
          rangeLow: rangeLow.trim() === "" ? null : Number(rangeLow),
          chartType: loaded.chart.chartType,
          bars: loaded.chart.bars,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        analysis?: AnalysisResult;
        error?: string;
        code?: string;
      };

      if (response.status === 402) {
        setLocked(true);
        setAnalysis(null);
        setError(payload.error ?? "Your free trial has ended. Choose a plan to continue.");
        setStatus(null);
        return;
      }
      if (!response.ok || !payload.analysis) {
        setError(payload.error ?? "The analysis could not be completed.");
        setStatus(null);
        return;
      }

      setAnalysis(payload.analysis);
      setStatus(`Analysed ${payload.analysis.bars} price columns.`);
    } catch {
      setError("Network error while analysing. Check your connection and try again.");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  if (!hasAccess) {
    return (
      <section className="card p-6 text-center sm:p-8">
        <span className="badge badge-rose">Free trial ended</span>
        <h2 className="mt-4 text-xl font-semibold text-violet-50">Analysis is locked on this account</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-violet-200/75">
          Your 5-day free trial has finished. Choose a plan to keep uploading screenshots and
          practising entries, stops and targets.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/plans" className="btn-primary">
            View plans
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Refresh access
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="eyebrow">Step 1 · screenshot</p>
            <h2 className="mt-1 text-lg font-semibold text-violet-50">Upload a chart from your phone</h2>
          </div>
          <span className="badge">Paper trading practice only</span>
        </div>

        <div
          className="dropzone mt-4 px-4 py-7 text-center"
          data-active={dragging}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void handleFile(event.dataTransfer.files?.[0]);
          }}
        >
          <p className="text-sm font-medium text-violet-100">
            {loaded ? loaded.fileName : "Take a photo of the chart, or pick a screenshot"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-violet-300/65">
            Crop tight to the candles and include the price scale. PNG, JPG or WebP up to about 8 MB.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              className="btn-primary"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
            >
              Take photo
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => galleryRef.current?.click()}
              disabled={busy}
            >
              Choose from gallery
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </div>

        {loaded ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[9rem_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loaded.previewUrl}
              alt="Uploaded chart screenshot preview"
              className="h-32 w-full rounded-xl border border-violet-400/20 object-cover"
            />
            <div className="space-y-2">
              <SeriesPreview bars={loaded.chart.bars} chartType={loaded.chart.chartType} />
              <p className="text-[0.7rem] text-violet-300/60">
                {loaded.chart.width}×{loaded.chart.height}px · ink {Math.round(loaded.chart.inkRatio * 1000) / 10}%
                {loaded.chart.gapColumns > 0 ? ` · ${loaded.chart.gapColumns} interpolated columns` : ""}
              </p>
            </div>
          </div>
        ) : null}

        {status ? <p className="mt-3 text-xs text-violet-300/75">{status}</p> : null}
      </section>

      <form onSubmit={runAnalysis} className="card p-5 sm:p-6">
        <p className="eyebrow">Step 2 · price anchor</p>
        <h2 className="mt-1 text-lg font-semibold text-violet-50">Add the numbers from the chart</h2>
        <p className="mt-1 text-xs leading-relaxed text-violet-300/65">
          The screenshot has no price axis, so the last price (and optionally the visible high and
          low) anchors the pixels to real values.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="symbol" className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-violet-300/70">
              Symbol (optional)
            </label>
            <input
              id="symbol"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="BTCUSDT"
              maxLength={20}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="lastPrice" className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-violet-300/70">
              Last price *
            </label>
            <input
              id="lastPrice"
              value={lastPrice}
              onChange={(event) => setLastPrice(event.target.value)}
              inputMode="decimal"
              placeholder="64100"
              required
              className="field"
            />
          </div>
          <div>
            <label htmlFor="rangeHigh" className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-violet-300/70">
              Visible high (optional)
            </label>
            <input
              id="rangeHigh"
              value={rangeHigh}
              onChange={(event) => setRangeHigh(event.target.value)}
              inputMode="decimal"
              placeholder="66800"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="rangeLow" className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-violet-300/70">
              Visible low (optional)
            </label>
            <input
              id="rangeLow"
              value={rangeLow}
              onChange={(event) => setRangeLow(event.target.value)}
              inputMode="decimal"
              placeholder="61200"
              className="field"
            />
          </div>
        </div>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
            {error}
            {locked ? (
              <Link href="/plans" className="ml-2 font-semibold underline underline-offset-4">
                Choose a plan
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy || !loaded}>
            {busy ? "Working…" : analysis ? "Recalculate analysis" : "Analyse chart"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={busy}
            onClick={() => {
              setLoaded(null);
              setAnalysis(null);
              setError(null);
              setStatus(null);
              setLocked(false);
              setSymbol("");
              setLastPrice("");
              setRangeHigh("");
              setRangeLow("");
            }}
          >
            Clear
          </button>
          {!loaded ? (
            <span className="text-xs text-violet-300/55">Upload a screenshot to enable the analysis.</span>
          ) : null}
        </div>
      </form>

      {analysis ? <AnalysisReport analysis={analysis} /> : null}
    </div>
  );
}
