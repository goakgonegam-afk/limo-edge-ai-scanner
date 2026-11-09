import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { analyzeChart, AnalysisInputError, type AnalysisResult } from "@/lib/analysis";
import { getSessionUser } from "@/lib/auth";
import { addAnalysis } from "@/lib/store";
import { computeAccess } from "@/lib/trial";
import { parseAnalysisRequest, RequestValidationError } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to analyse a chart.", code: "unauthenticated" }, { status: 401 });
  }

  const access = computeAccess(user);
  if (!access.hasAccess) {
    return NextResponse.json(
      {
        error: "Your 5-day free trial has ended. Choose a plan to keep analysing charts.",
        code: "trial_expired",
      },
      { status: 402 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  try {
    const parsed = parseAnalysisRequest(body);
    const analysis: AnalysisResult = analyzeChart({
      symbol: parsed.symbol,
      lastPrice: parsed.lastPrice,
      rangeHigh: parsed.rangeHigh,
      rangeLow: parsed.rangeLow,
      chartType: parsed.chartType,
      bars: parsed.bars,
    });

    await addAnalysis(user.id, {
      id: randomUUID(),
      createdAt: analysis.createdAt,
      symbol: analysis.symbol,
      lastPrice: parsed.lastPrice,
      bias: analysis.plan.bias,
      entry: analysis.plan.entry,
      stopLoss: analysis.plan.stopLoss,
      takeProfit: analysis.plan.takeProfit,
      rsi14: analysis.indicators.rsi14,
      atrPercent: analysis.indicators.atrPercent,
      bars: analysis.bars,
      chartType: analysis.chartType,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, code: "invalid_request" }, { status: error.status });
    }
    if (error instanceof AnalysisInputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: "The analysis could not be completed." }, { status: 500 });
  }
}
