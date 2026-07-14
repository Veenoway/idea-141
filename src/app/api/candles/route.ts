import { fetchCandles } from "@/lib/data/fetchCandles";
import type { Timeframe } from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const marketId = Number(searchParams.get("marketId") ?? "1");
  const timeframe = (searchParams.get("timeframe") ?? "1h") as Timeframe;

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const daysParam = searchParams.get("days");

  let fromMs: number;
  let toMs: number;

  if (fromParam && toParam) {
    fromMs = new Date(`${fromParam}T00:00:00`).getTime();
    toMs = new Date(`${toParam}T23:59:59`).getTime();
    if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
  } else {
    const days = Math.min(365, Math.max(1, Number(daysParam ?? "30")));
    toMs = Date.now();
    fromMs = toMs - days * 86_400_000;
  }

  try {
    const result = await fetchCandles(marketId, timeframe, fromMs, toMs);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch candles";
    const status = message.includes("429") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
