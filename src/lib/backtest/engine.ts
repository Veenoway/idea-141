import { generateSignals, getStrategyWarmup } from "@/lib/backtest/strategies";
import type {
  BacktestConfig,
  BacktestResult,
  Candle,
  EquityPoint,
  ReplayEvent,
  Trade,
  TradeSide,
} from "@/types";

interface OpenPosition {
  side: TradeSide;
  entryTime: number;
  entryPrice: number;
  size: number;
  margin: number;
}

function fee(notional: number, bps: number): number {
  return (notional * bps) / 10_000;
}

function unrealizedPnl(
  side: TradeSide,
  entry: number,
  current: number,
  size: number
): number {
  return side === "long" ? (current - entry) * size : (entry - current) * size;
}

function getWarmup(config: BacktestConfig): number {
  return getStrategyWarmup(config);
}

function checkStopTakeProfit(
  pos: OpenPosition,
  candle: Candle,
  config: BacktestConfig
): "stop_loss" | "take_profit" | null {
  const { stopLossPercent, takeProfitPercent } = config;
  const sl = stopLossPercent / 100;
  const tp = takeProfitPercent / 100;

  if (pos.side === "long") {
    const slPrice = pos.entryPrice * (1 - sl);
    const tpPrice = pos.entryPrice * (1 + tp);
    if (candle.low <= slPrice) return "stop_loss";
    if (candle.high >= tpPrice) return "take_profit";
  } else {
    const slPrice = pos.entryPrice * (1 + sl);
    const tpPrice = pos.entryPrice * (1 - tp);
    if (candle.high >= slPrice) return "stop_loss";
    if (candle.low <= tpPrice) return "take_profit";
  }
  return null;
}

function exitPriceForSlTp(
  pos: OpenPosition,
  exitReason: "stop_loss" | "take_profit",
  config: BacktestConfig
): number {
  if (exitReason === "stop_loss") {
    return pos.side === "long"
      ? pos.entryPrice * (1 - config.stopLossPercent / 100)
      : pos.entryPrice * (1 + config.stopLossPercent / 100);
  }
  return pos.side === "long"
    ? pos.entryPrice * (1 + config.takeProfitPercent / 100)
    : pos.entryPrice * (1 - config.takeProfitPercent / 100);
}

export function runBacktest(
  candles: Candle[],
  config: BacktestConfig
): BacktestResult {
  const warmup = getWarmup(config);
  const signals = generateSignals(candles, config);

  let cash = config.initialCapital;
  const state: { openPos: OpenPosition | null } = { openPos: null };
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  const events: ReplayEvent[] = [];
  let tradeId = 1;
  let totalFunding = 0;
  let nextFundingAt =
    candles.length > 0
      ? Math.ceil(candles[0].time / (config.fundingIntervalSec * 1000)) *
        config.fundingIntervalSec *
        1000
      : 0;

  const applyFunding = (candle: Candle) => {
    if (!config.enableFunding || !state.openPos) return;
    const intervalMs = config.fundingIntervalSec * 1000;

    while (nextFundingAt <= candle.time) {
      const notional = state.openPos.size * candle.close;
      const payment = notional * (config.fundingRateBps / 10_000);
      if (state.openPos.side === "long") {
        cash -= payment;
        totalFunding -= payment;
      } else {
        cash += payment;
        totalFunding += payment;
      }
      const fundingDelta = state.openPos.side === "long" ? -payment : payment;
      events.push({
        time: nextFundingAt,
        type: "funding",
        label: `${state.openPos.side} ${payment >= 0 ? "+" : ""}$${payment.toFixed(2)}`,
        amount: fundingDelta,
      });
      nextFundingAt += intervalMs;
    }
  };

  const closePosition = (
    candle: Candle,
    reason: Trade["reason"],
    exitOverride?: number
  ) => {
    if (!state.openPos) return;
    const exitPrice = exitOverride ?? candle.close;
    const gross = unrealizedPnl(state.openPos.side, state.openPos.entryPrice, exitPrice, state.openPos.size);
    const entryFee = fee(state.openPos.size * state.openPos.entryPrice, config.takerFeeBps);
    const pnl = gross - entryFee;
    cash += state.openPos.margin + gross;

    trades.push({
      id: tradeId++,
      side: state.openPos.side,
      entryTime: state.openPos.entryTime,
      exitTime: candle.time,
      entryPrice: state.openPos.entryPrice,
      exitPrice,
      size: state.openPos.size,
      pnl,
      pnlPercent: (pnl / state.openPos.margin) * 100,
      reason,
    });
    events.push({
      time: candle.time,
      type: reason === "end" || reason === "signal" ? "close" : reason,
      label: `Exit ${state.openPos.side} · ${reason}`,
    });
    state.openPos = null;
  };

  const openPosition = (side: TradeSide, candle: Candle) => {
    const margin = cash * 0.95;
    if (margin <= 0) return;
    const notional = margin * config.leverage;
    const size = notional / candle.close;
    const entryFee = fee(notional, config.takerFeeBps);
    cash -= margin + entryFee;
    state.openPos = {
      side,
      entryTime: candle.time,
      entryPrice: candle.close,
      size,
      margin,
    };
    events.push({
      time: candle.time,
      type: side,
      label: `Open ${side} @ $${candle.close.toFixed(2)}`,
    });
  };

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    applyFunding(candle);

    if (state.openPos) {
      const exitReason = checkStopTakeProfit(state.openPos, candle, config);
      if (exitReason) {
        closePosition(candle, exitReason, exitPriceForSlTp(state.openPos, exitReason, config));
      }
    }

    if (i >= warmup) {
      const signal = signals[i];
      if (signal === "close" && state.openPos) {
        closePosition(candle, "signal");
      } else if (signal === "long") {
        if (state.openPos?.side === "short") closePosition(candle, "signal");
        if (!state.openPos) openPosition("long", candle);
      } else if (signal === "short") {
        if (state.openPos?.side === "long") closePosition(candle, "signal");
        if (!state.openPos) openPosition("short", candle);
      }
    }

    let eq = cash;
    if (state.openPos) {
      eq += state.openPos.margin + unrealizedPnl(state.openPos.side, state.openPos.entryPrice, candle.close, state.openPos.size);
    }
    equity.push({ time: candle.time, equity: eq });
  }

  if (state.openPos && candles.length > 0) {
    closePosition(candles[candles.length - 1], "end");
  }

  const metrics = computeMetrics(config.initialCapital, trades, equity, totalFunding);
  return { trades, equity, metrics, events };
}

export function computeMetrics(
  initialCapital: number,
  trades: Trade[],
  equity: EquityPoint[],
  totalFunding: number
) {
  const finalCapital = equity.length ? equity[equity.length - 1].equity : initialCapital;
  const totalPnl = finalCapital - initialCapital;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));

  let peak = initialCapital;
  let maxDrawdown = 0;
  for (const point of equity) {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.max(maxDrawdown, peak - point.equity);
  }

  return {
    initialCapital,
    finalCapital,
    totalPnl,
    totalPnlPercent: (totalPnl / initialCapital) * 100,
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    maxDrawdown,
    maxDrawdownPercent: peak > 0 ? (maxDrawdown / peak) * 100 : 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? -grossLoss / losses.length : 0,
    bestTrade: trades.length ? Math.max(...trades.map((t) => t.pnl)) : 0,
    worstTrade: trades.length ? Math.min(...trades.map((t) => t.pnl)) : 0,
    totalFunding,
  };
}
