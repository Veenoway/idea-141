import type { Candle } from "@/types";

export function sliceByEnd<T>(items: T[], sliceEnd?: number): T[] {
  if (sliceEnd == null) return items;
  return items.slice(0, Math.min(sliceEnd + 1, items.length));
}

export function sliceByRange<T>(items: T[], sliceStart = 0, sliceEnd?: number): T[] {
  const start = Math.max(0, Math.min(sliceStart, items.length));
  const end = sliceEnd == null ? items.length : Math.min(sliceEnd + 1, items.length);
  if (start >= end) return [];
  return items.slice(start, end);
}

export function sliceCandles(
  candles: Candle[],
  sliceEnd?: number,
  sliceStart = 0
): Candle[] {
  if (sliceEnd == null) {
    return sliceStart > 0 ? candles.slice(sliceStart) : candles;
  }
  return sliceByRange(candles, sliceStart, sliceEnd);
}
