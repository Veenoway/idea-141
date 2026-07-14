import { PERPL_API_URL } from "@/lib/constants";
import { getCached, setCache } from "@/lib/cache";
import { resolveMarketIconUrl } from "@/lib/market-icons";

interface PerplMarket {
  id: number;
  name: string;
  icon?: string;
}

interface PerplContext {
  markets: PerplMarket[];
}

export type MarketIconMap = Record<string, string>;

const CACHE_KEY = "perpl-market-icons";

export async function fetchMarketIcons(): Promise<MarketIconMap> {
  const cached = getCached<MarketIconMap>(CACHE_KEY);
  if (cached) return cached;

  const res = await fetch(`${PERPL_API_URL}/v1/pub/context`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Perpl context error: ${res.status}`);

  const ctx: PerplContext = await res.json();
  const icons: MarketIconMap = {};

  for (const market of ctx.markets) {
    const url = resolveMarketIconUrl(market.name, market.icon);
    if (url) icons[market.name.toUpperCase()] = url;
  }

  setCache(CACHE_KEY, icons, 60 * 60 * 1000);
  return icons;
}
