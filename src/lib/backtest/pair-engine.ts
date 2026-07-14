import { generatePairSignals, getPairStrategyWarmup } from "@/lib/backtest/pair-strategies";
import { computeMetrics } from "@/lib/backtest/engine";
import type { AlignedPairSeries } from "@/lib/backtest/pair-utils";
import type {
  BacktestConfig,
  BacktestResult,
  Candle,
  EquityPoint,
  ReplayEvent,
  Trade,
  TradeSide,
} from "@/types";

interface PairPosition {
  side: TradeSide;
  entryTime: number;
  entryRatio: number;
  entryBasePrice: number;
  entryQuotePrice: number;
  baseSize: number;
  quoteSize: number;
  margin: number;
}

export interface PairBacktestInput {
  series: AlignedPairSeries;
  config: BacktestConfig;
  baseSymbol: string;
  quoteSymbol: string;
}

function fee(notional: number, bps: number): number {
  return (notional * bps) / 10_000;
}

function unrealizedPairPnl(
  pos: PairPosition,
  basePrice: number,
  quotePrice: number
): number {
  const basePnl =
    pos.side === "long"
      ? (basePrice - pos.entryBasePrice) * pos.baseSize
      : (pos.entryBasePrice - basePrice) * pos.baseSize;
  const quotePnl =
    pos.side === "long"
      ? (pos.entryQuotePrice - quotePrice) * pos.quoteSize
      : (quotePrice - pos.entryQuotePrice) * pos.quoteSize;
  return basePnl + quotePnl;
}

function checkPairStopTakeProfit(
  pos: PairPosition,
  ratioCandle: Candle,
  config: BacktestConfig
): "stop_loss" | "take_profit" | null {
  const sl = config.stopLossPercent / 100;
  const tp = config.takeProfitPercent / 100;

  if (pos.side === "long") {
    const slRatio = pos.entryRatio * (1 - sl / config.leverage);
    const tpRatio = pos.entryRatio * (1 + tp / config.leverage);
    if (ratioCandle.low <= slRatio) return "stop_loss";
    if (ratioCandle.high >= tpRatio) return "take_profit";
  } else {
    const slRatio = pos.entryRatio * (1 + sl / config.leverage);
    const tpRatio = pos.entryRatio * (1 - tp / config.leverage);
    if (ratioCandle.high >= slRatio) return "stop_loss";
    if (ratioCandle.low <= tpRatio) return "take_profit";
  }
  return null;
}

function exitRatioForSlTp(
  pos: PairPosition,
  exitReason: "stop_loss" | "take_profit",
  config: BacktestConfig
): number {
  const sl = config.stopLossPercent / 100;
  const tp = config.takeProfitPercent / 100;
  if (exitReason === "stop_loss") {
    return pos.side === "long"
      ? pos.entryRatio * (1 - sl / config.leverage)
      : pos.entryRatio * (1 + sl / config.leverage);
  }
  return pos.side === "long"
    ? pos.entryRatio * (1 + tp / config.leverage)
    : pos.entryRatio * (1 - tp / config.leverage);
}

export function runPairBacktest(input: PairBacktestInput): BacktestResult {
  const { series, config, baseSymbol, quoteSymbol } = input;
  const { base, quote, ratio } = series;
  const warmup = getPairStrategyWarmup(config);
  const signals = generatePairSignals(ratio, config);

  let cash = config.initialCapital;
  const state = { openPos: null as PairPosition | null };
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  const events: ReplayEvent[] = [];
  let tradeId = 1;
  const totalFunding = 0;

  const legLabel = (side: TradeSide) =>
    side === "long"
      ? `Long ${baseSymbol} · Short ${quoteSymbol}`
      : `Short ${baseSymbol} · Long ${quoteSymbol}`;

  const closePosition = (
    i: number,
    reason: Trade["reason"],
    ratioOverride?: number
  ) => {
    if (!state.openPos) return;
    const openPos = state.openPos;
    const exitRatio = ratioOverride ?? ratio[i].close;
    const exitBase = base[i].close;
    const exitQuote = exitBase / exitRatio;

    const gross = unrealizedPairPnl(openPos, exitBase, exitQuote);
    const entryFee =
      fee(openPos.baseSize * openPos.entryBasePrice, config.takerFeeBps) +
      fee(openPos.quoteSize * openPos.entryQuotePrice, config.takerFeeBps);
    const exitFee =
      fee(openPos.baseSize * exitBase, config.takerFeeBps) +
      fee(openPos.quoteSize * exitQuote, config.takerFeeBps);
    const pnl = gross - entryFee - exitFee;
    cash += openPos.margin + pnl;

    trades.push({
      id: tradeId++,
      side: openPos.side,
      entryTime: openPos.entryTime,
      exitTime: ratio[i].time,
      entryPrice: openPos.entryRatio,
      exitPrice: exitRatio,
      size: openPos.baseSize + openPos.quoteSize,
      pnl,
      pnlPercent: openPos.margin > 0 ? (pnl / openPos.margin) * 100 : 0,
      reason,
    });
    events.push({
      time: ratio[i].time,
      type: reason === "end" || reason === "signal" ? "close" : reason,
      label: `Close ${legLabel(openPos.side)} · ${reason}`,
    });
    state.openPos = null;
  };

  const openPosition = (side: TradeSide, i: number) => {
    const margin = cash * 0.95;
    if (margin <= 0) return;

    const legMargin = margin / 2;
    const baseNotional = legMargin * config.leverage;
    const quoteNotional = legMargin * config.leverage;
    const basePrice = base[i].close;
    const quotePrice = quote[i].close;
    const baseSize = baseNotional / basePrice;
    const quoteSize = quoteNotional / quotePrice;
    const entryFee =
      fee(baseNotional, config.takerFeeBps) + fee(quoteNotional, config.takerFeeBps);

    cash -= margin + entryFee;
    state.openPos = {
      side,
      entryTime: ratio[i].time,
      entryRatio: ratio[i].close,
      entryBasePrice: basePrice,
      entryQuotePrice: quotePrice,
      baseSize,
      quoteSize,
      margin,
    };
    events.push({
      time: ratio[i].time,
      type: side,
      label: `${legLabel(side)} @ ${ratio[i].close.toFixed(4)}`,
    });
  };

  for (let i = 0; i < ratio.length; i++) {
    if (state.openPos) {
      const exitReason = checkPairStopTakeProfit(state.openPos, ratio[i], config);
      if (exitReason) {
        closePosition(i, exitReason, exitRatioForSlTp(state.openPos, exitReason, config));
      }
    }

    if (i >= warmup) {
      const signal = signals[i];
      const posSide = state.openPos?.side;

      if (signal === "close" && state.openPos) {
        closePosition(i, "signal");
      } else if (signal === "long") {
        if (posSide === "short") closePosition(i, "signal");
        if (!state.openPos) openPosition("long", i);
      } else if (signal === "short") {
        if (posSide === "long") closePosition(i, "signal");
        if (!state.openPos) openPosition("short", i);
      }
    }

    let eq = cash;
    if (state.openPos) {
      eq +=
        state.openPos.margin +
        unrealizedPairPnl(state.openPos, base[i].close, quote[i].close);
    }
    equity.push({ time: ratio[i].time, equity: eq });
  }

  if (state.openPos && ratio.length > 0) {
    closePosition(ratio.length - 1, "end");
  }

  const metrics = computeMetrics(config.initialCapital, trades, equity, totalFunding);
  return { trades, equity, metrics, events };
}
