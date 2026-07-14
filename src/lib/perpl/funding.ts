import { PERPL_API_URL } from "@/lib/constants";
import { getCached, setCache } from "@/lib/cache";
import type { FundingInfo } from "@/types";

interface PerplMarketFunding {
  id: number;
  funding_interval_sec: number;
  funding?: { rate: number; div?: number };
  config?: { taker_fee: number };
}

interface PerplContext {
  markets: PerplMarketFunding[];
}

/** Perpl encodes fees/rates as integer bps × 100 (e.g. taker 690 → 6.9 bps) */
function toBps(raw: number, div = 1): number {
  return raw / div / 100;
}

export async function fetchPerplFunding(marketId: number): Promise<FundingInfo> {
  const cacheKey = `perpl-funding-${marketId}`;
  const cached = getCached<FundingInfo>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${PERPL_API_URL}/v1/pub/context`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Perpl context error: ${res.status}`);

  const ctx: PerplContext = await res.json();
  const market = ctx.markets.find((m) => m.id === marketId);
  if (!market) throw new Error(`Market ${marketId} not found`);

  const info: FundingInfo = {
    rateBps: toBps(market.funding?.rate ?? 0, market.funding?.div ?? 1),
    intervalSec: market.funding_interval_sec ?? 3600,
    takerFeeBps: toBps(market.config?.taker_fee ?? 690),
  };

  setCache(cacheKey, info, 5 * 60 * 1000);
  return info;
}
