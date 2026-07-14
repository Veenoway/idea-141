import { MAX_CANDLES, PERPL_API_URL } from "@/lib/constants";
import { getCached, setCache, sleep } from "@/lib/cache";
import type { Candle, MarketOption } from "@/types";

interface PerplCandle {
  t: number;
  o: number;
  c: number;
  h: number;
  l: number;
  v: string;
  n: number;
}

interface PerplCandleResponse {
  r: number;
  d: PerplCandle[];
}

function scalePrice(raw: number, priceDecimals: number): number {
  return raw / Math.pow(10, priceDecimals);
}

/** ~85 req/min — stays under Perpl's ~100/min public limit */
const CHUNK_DELAY_MS = 700;
const MAX_RETRIES = 4;

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, { next: { revalidate: 120 } });

    if (res.status === 429) {
      const delay = Math.pow(2, attempt + 1) * 1000;
      await sleep(delay);
      continue;
    }

    return res;
  }

  throw new Error("Perpl rate limit (429) — try again in a minute or use a shorter history");
}

export async function fetchPerplCandles(
  market: MarketOption,
  resolutionSec: number,
  fromMs: number,
  toMs: number
): Promise<Candle[]> {
  const cacheKey = `perpl-candles-${market.id}-${resolutionSec}-${fromMs}-${toMs}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return cached;

  const all: Candle[] = [];
  let cursor = fromMs;
  const stepMs = resolutionSec * 1000 * MAX_CANDLES;
  let isFirstChunk = true;

  while (cursor < toMs) {
    if (!isFirstChunk) await sleep(CHUNK_DELAY_MS);
    isFirstChunk = false;

    const chunkEnd = Math.min(cursor + stepMs, toMs);
    const url = `${PERPL_API_URL}/v1/market-data/${market.id}/candles/${resolutionSec}/${cursor}-${chunkEnd}`;

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`Perpl candles error: ${res.status}`);
    }

    const data: PerplCandleResponse = await res.json();
    const batch = (data.d ?? []).map((c) => ({
      time: c.t,
      open: scalePrice(c.o, market.priceDecimals),
      high: scalePrice(c.h, market.priceDecimals),
      low: scalePrice(c.l, market.priceDecimals),
      close: scalePrice(c.c, market.priceDecimals),
      volume: Number(c.v) / 1e6,
    }));

    all.push(...batch);
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].time + resolutionSec * 1000;
  }

  const unique = new Map<number, Candle>();
  for (const c of all) unique.set(c.time, c);
  const candles = [...unique.values()].sort((a, b) => a.time - b.time);

  setCache(cacheKey, candles, 10 * 60 * 1000);
  return candles;
}
