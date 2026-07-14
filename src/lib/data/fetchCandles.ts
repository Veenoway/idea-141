import { MARKETS, TIMEFRAME_SECONDS } from "@/lib/constants";
import { getCached, setCache } from "@/lib/cache";
import { fetchMobulaCandles } from "@/lib/mobula/client";
import { fetchPerplCandles } from "@/lib/perpl/client";
import { fetchPerplFunding } from "@/lib/perpl/funding";
import type { CandleFetchResult, Timeframe } from "@/types";

export async function fetchCandles(
  marketId: number,
  timeframe: Timeframe,
  fromMs: number,
  toMs: number
): Promise<CandleFetchResult> {
  const cacheKey = `candles-${marketId}-${timeframe}-${fromMs}-${toMs}`;
  const cached = getCached<CandleFetchResult>(cacheKey);
  if (cached) return cached;

  const market = MARKETS.find((m) => m.id === marketId);
  if (!market) throw new Error(`Unknown market id: ${marketId}`);

  const resolution = TIMEFRAME_SECONDS[timeframe];
  let funding = undefined;

  try {
    funding = await fetchPerplFunding(marketId);
  } catch {
    // optional
  }

  try {
    const candles = await fetchPerplCandles(market, resolution, fromMs, toMs);
    if (candles.length >= 50) {
      const result: CandleFetchResult = {
        candles,
        source: "perpl",
        market: market.name,
        funding,
      };
      setCache(cacheKey, result, 10 * 60 * 1000);
      return result;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429")) throw err;
  }

  const candles = await fetchMobulaCandles(market, timeframe, fromMs, toMs);
  const result: CandleFetchResult = {
    candles,
    source: "mobula",
    market: market.name,
    funding,
  };
  setCache(cacheKey, result, 10 * 60 * 1000);
  return result;
}
