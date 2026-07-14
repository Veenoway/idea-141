import { computeMetrics } from "@/lib/backtest/engine";
import { sliceByEnd } from "@/lib/chart-utils";
import type { BacktestMetrics, BacktestResult, Candle, Trade } from "@/types";

export function replayBarIntervalMs(barIntervalMs: number): number {
  return Math.max(barIntervalMs, 60_000);
}

export function replayMaxGapMs(barIntervalMs: number): number {
  return replayBarIntervalMs(barIntervalMs) * 3;
}

function isValidCandle(c: Candle): boolean {
  return c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0;
}

/** First bar where OHLC is valid and the next bar is on cadence (skips leading data gaps). */
export function findReplayStartIndex(candles: Candle[], barIntervalMs: number): number {
  if (candles.length <= 1) return 0;

  const maxGap = replayMaxGapMs(barIntervalMs);
  let start = 0;

  while (start < candles.length && !isValidCandle(candles[start])) {
    start++;
  }
  if (start >= candles.length) return 0;

  while (start < candles.length - 1) {
    const gap = candles[start + 1].time - candles[start].time;
    if (gap <= maxGap) break;
    start++;
  }

  return Math.min(start, candles.length - 1);
}

/** Advance replay index, jumping over multi-day/timeframe gaps in the feed. */
export function nextReplayIndex(
  candles: Candle[],
  current: number,
  barIntervalMs: number
): number {
  if (current >= candles.length - 1) return current;

  const maxGap = replayMaxGapMs(barIntervalMs);
  let next = current + 1;

  while (next < candles.length) {
    const gap = candles[next].time - candles[current].time;
    if (gap <= maxGap) return next;
    next++;
  }

  return candles.length - 1;
}

export function replayTime(candles: Candle[], sliceEnd: number): number {
  return candles[sliceEnd]?.time ?? 0;
}

export function tradesVisibleAt(result: BacktestResult, currentTime: number): Trade[] {
  return result.trades.filter((t) => t.exitTime <= currentTime);
}

export function computeReplayMetrics(
  result: BacktestResult,
  candles: Candle[],
  sliceEnd: number
): BacktestMetrics {
  const currentTime = replayTime(candles, sliceEnd);
  const visibleEquity = sliceByEnd(result.equity, sliceEnd);
  const visibleTrades = tradesVisibleAt(result, currentTime);
  const totalFunding = result.events
    .filter((e) => e.type === "funding" && e.time <= currentTime)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return computeMetrics(
    result.metrics.initialCapital,
    visibleTrades,
    visibleEquity,
    totalFunding
  );
}
