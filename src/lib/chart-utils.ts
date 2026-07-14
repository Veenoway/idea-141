import type { Candle } from "@/types";

export function sliceByEnd<T>(items: T[], sliceEnd?: number): T[] {
  if (sliceEnd == null) return items;
  return items.slice(0, Math.min(sliceEnd + 1, items.length));
}

export function sliceCandles(candles: Candle[], sliceEnd?: number): Candle[] {
  return sliceByEnd(candles, sliceEnd);
}
