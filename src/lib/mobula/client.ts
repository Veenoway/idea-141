import { MOBULA_PERIOD } from "@/lib/constants";
import type { Candle, MarketOption, Timeframe } from "@/types";

interface MobulaHistoryResponse {
  data?: {
    price_history?: [number, number][];
  };
}

export async function fetchMobulaCandles(
  market: MarketOption,
  timeframe: Timeframe,
  fromMs: number,
  toMs: number
): Promise<Candle[]> {
  const period = MOBULA_PERIOD[timeframe];
  const url = new URL("https://api.mobula.io/api/1/market/history");
  url.searchParams.set("period", period);
  url.searchParams.set("asset", market.mobulaAsset);
  url.searchParams.set("from", String(fromMs));
  url.searchParams.set("to", String(toMs));

  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Mobula error: ${res.status}`);
  }

  const json: MobulaHistoryResponse = await res.json();
  const history = json.data?.price_history ?? [];

  if (history.length === 0) return [];

  const candles: Candle[] = [];
  for (let i = 0; i < history.length; i++) {
    const [time, price] = history[i];
    const prevClose = i > 0 ? history[i - 1][1] : price;
    candles.push({
      time,
      open: prevClose,
      high: Math.max(prevClose, price),
      low: Math.min(prevClose, price),
      close: price,
      volume: 0,
    });
  }

  return candles;
}
