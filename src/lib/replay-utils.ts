import { computeMetrics } from "@/lib/backtest/engine";
import { sliceByEnd } from "@/lib/chart-utils";
import type { BacktestMetrics, BacktestResult, Candle, Trade } from "@/types";

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
