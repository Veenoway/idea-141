import { ema, sma } from "@/lib/indicators";
import { rollingStd } from "@/lib/backtest/pair-utils";
import type { BacktestConfig, Candle } from "@/types";
import type { Signal } from "@/lib/backtest/strategies";

export function getPairStrategyWarmup(config: BacktestConfig): number {
  const p = config.strategyParams;
  if (config.strategy === "pair_mean_reversion") {
    return p.pairZPeriod + 2;
  }
  if (config.strategy === "pair_momentum") {
    return Math.max(p.fastPeriod, p.slowPeriod) + 2;
  }
  return 30;
}

export function generatePairSignals(ratioCandles: Candle[], config: BacktestConfig): Signal[] {
  const closes = ratioCandles.map((c) => c.close);
  const p = config.strategyParams;

  if (config.strategy === "pair_mean_reversion") {
    return pairMeanReversionSignals(
      closes,
      p.pairZPeriod,
      p.pairZEntry,
      p.pairZExit
    );
  }

  if (config.strategy === "pair_momentum") {
    return pairMomentumSignals(closes, p.fastPeriod, p.slowPeriod);
  }

  return new Array(closes.length).fill("hold");
}

function pairMeanReversionSignals(
  closes: number[],
  period: number,
  entryZ: number,
  exitZ: number
): Signal[] {
  const logCloses = closes.map((c) => Math.log(c));
  const mean = sma(logCloses, period);
  const std = rollingStd(logCloses, period);
  const signals: Signal[] = new Array(closes.length).fill("hold");
  let position: "long" | "short" | null = null;

  for (let i = 1; i < closes.length; i++) {
    if (mean[i] == null || std[i] == null || std[i] === 0) continue;

    const z = (logCloses[i] - mean[i]!) / std[i]!;

    if (position === "long") {
      if (z >= -exitZ || z >= entryZ) {
        signals[i] = "close";
        position = null;
      }
      continue;
    }

    if (position === "short") {
      if (z <= exitZ || z <= -entryZ) {
        signals[i] = "close";
        position = null;
      }
      continue;
    }

    if (z <= -entryZ) {
      signals[i] = "long";
      position = "long";
    } else if (z >= entryZ) {
      signals[i] = "short";
      position = "short";
    }
  }

  return signals;
}

function pairMomentumSignals(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number
): Signal[] {
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  const signals: Signal[] = new Array(closes.length).fill("hold");

  for (let i = 1; i < closes.length; i++) {
    if (fast[i] == null || slow[i] == null || fast[i - 1] == null || slow[i - 1] == null) {
      continue;
    }
    const crossUp = fast[i - 1]! <= slow[i - 1]! && fast[i]! > slow[i]!;
    const crossDown = fast[i - 1]! >= slow[i - 1]! && fast[i]! < slow[i]!;
    if (crossUp) signals[i] = "long";
    else if (crossDown) signals[i] = "short";
  }

  return signals;
}
