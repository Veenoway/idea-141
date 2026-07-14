import { bollinger, ema, macd, rsi, sma, stochastic } from "@/lib/indicators";
import type { BacktestConfig, Candle } from "@/types";

export type Signal = "long" | "short" | "close" | "hold";

function donchian(candles: Candle[], period: number) {
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);

  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, candles[j].high);
      lo = Math.min(lo, candles[j].low);
    }
    upper[i] = hi;
    lower[i] = lo;
  }
  return { upper, lower };
}

export function getStrategyWarmup(config: BacktestConfig): number {
  const p = config.strategyParams;
  switch (config.strategy) {
    case "ma_crossover":
    case "ema_crossover":
      return Math.max(p.slowPeriod, p.fastPeriod) + 2;
    case "rsi":
      return p.rsiPeriod + 2;
    case "macd":
      return Math.max(p.macdSlow, p.macdSignal) + 2;
    case "bollinger":
      return p.bollingerPeriod + 2;
    case "breakout":
      return p.breakoutPeriod + 2;
    case "stochastic":
      return p.stochKPeriod + p.stochDPeriod + 2;
    default:
      return 30;
  }
}

export function generateSignals(candles: Candle[], config: BacktestConfig): Signal[] {
  const closes = candles.map((c) => c.close);
  const signals: Signal[] = new Array(candles.length).fill("hold");
  const p = config.strategyParams;

  switch (config.strategy) {
    case "ma_crossover":
      return maCrossoverSignals(closes, sma(closes, p.fastPeriod), sma(closes, p.slowPeriod));
    case "ema_crossover":
      return maCrossoverSignals(closes, ema(closes, p.fastPeriod), ema(closes, p.slowPeriod));
    case "rsi":
      return rsiSignals(closes, rsi(closes, p.rsiPeriod), p.rsiOversold, p.rsiOverbought);
    case "macd":
      return macdSignals(macd(closes, p.macdFast, p.macdSlow, p.macdSignal));
    case "bollinger":
      return bollingerSignals(candles, bollinger(closes, p.bollingerPeriod, p.bollingerStdDev));
    case "breakout":
      return breakoutSignals(candles, donchian(candles, p.breakoutPeriod));
    case "stochastic":
      return stochasticSignals(
        stochastic(
          candles.map((c) => c.high),
          candles.map((c) => c.low),
          closes,
          p.stochKPeriod,
          p.stochDPeriod
        ),
        p.stochOversold,
        p.stochOverbought
      );
    default:
      return signals;
  }
}

function maCrossoverSignals(
  _closes: number[],
  fast: (number | null)[],
  slow: (number | null)[]
): Signal[] {
  const signals: Signal[] = new Array(fast.length).fill("hold");
  for (let i = 1; i < fast.length; i++) {
    if (fast[i] == null || slow[i] == null || fast[i - 1] == null || slow[i - 1] == null) continue;
    const crossUp = fast[i - 1]! <= slow[i - 1]! && fast[i]! > slow[i]!;
    const crossDown = fast[i - 1]! >= slow[i - 1]! && fast[i]! < slow[i]!;
    if (crossUp) signals[i] = "long";
    else if (crossDown) signals[i] = "short";
  }
  return signals;
}

function rsiSignals(
  _closes: number[],
  values: (number | null)[],
  oversold: number,
  overbought: number
): Signal[] {
  const signals: Signal[] = new Array(values.length).fill("hold");
  for (let i = 1; i < values.length; i++) {
    if (values[i] == null || values[i - 1] == null) continue;
    if (values[i - 1]! >= oversold && values[i]! < oversold) signals[i] = "long";
    else if (values[i - 1]! <= overbought && values[i]! > overbought) signals[i] = "short";
    else if (values[i]! >= 50 && values[i - 1]! < 50) signals[i] = "close";
  }
  return signals;
}

function macdSignals({ macd: line, signal: sig }: ReturnType<typeof macd>): Signal[] {
  const signals: Signal[] = new Array(line.length).fill("hold");
  for (let i = 1; i < line.length; i++) {
    if (line[i] == null || sig[i] == null || line[i - 1] == null || sig[i - 1] == null) continue;
    const crossUp = line[i - 1]! <= sig[i - 1]! && line[i]! > sig[i]!;
    const crossDown = line[i - 1]! >= sig[i - 1]! && line[i]! < sig[i]!;
    if (crossUp) signals[i] = "long";
    else if (crossDown) signals[i] = "short";
  }
  return signals;
}

function bollingerSignals(
  candles: Candle[],
  bands: ReturnType<typeof bollinger>
): Signal[] {
  const signals: Signal[] = new Array(candles.length).fill("hold");
  for (let i = 0; i < candles.length; i++) {
    const { lower, upper } = bands;
    if (lower[i] == null || upper[i] == null) continue;
    if (candles[i].low <= lower[i]!) signals[i] = "long";
    else if (candles[i].high >= upper[i]!) signals[i] = "short";
  }
  return signals;
}

function breakoutSignals(
  candles: Candle[],
  channel: ReturnType<typeof donchian>
): Signal[] {
  const signals: Signal[] = new Array(candles.length).fill("hold");
  for (let i = 1; i < candles.length; i++) {
    const { upper, lower } = channel;
    if (upper[i - 1] == null || lower[i - 1] == null) continue;
    if (candles[i].close > upper[i - 1]!) signals[i] = "long";
    else if (candles[i].close < lower[i - 1]!) signals[i] = "short";
  }
  return signals;
}

function stochasticSignals(
  { k, d }: ReturnType<typeof stochastic>,
  oversold: number,
  overbought: number
): Signal[] {
  const signals: Signal[] = new Array(k.length).fill("hold");
  for (let i = 1; i < k.length; i++) {
    if (k[i] == null || d[i] == null || k[i - 1] == null || d[i - 1] == null) continue;
    const crossUp = k[i - 1]! <= d[i - 1]! && k[i]! > d[i]! && k[i]! < oversold;
    const crossDown = k[i - 1]! >= d[i - 1]! && k[i]! < d[i]! && k[i]! > overbought;
    if (crossUp) signals[i] = "long";
    else if (crossDown) signals[i] = "short";
  }
  return signals;
}

export { donchian };
