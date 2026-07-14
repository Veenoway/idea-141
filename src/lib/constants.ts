import type { MarketOption, Timeframe, StrategyType } from "@/types";

export const PERPL_API_URL =
  process.env.PERPL_API_URL ?? "https://app.perpl.xyz/api";

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export const MOBULA_PERIOD: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

/** Perpl market_id → Mobula asset name fallback mapping */
export const MARKETS: MarketOption[] = [
  { id: 1, name: "BTC", priceDecimals: 1, mobulaAsset: "Bitcoin" },
  { id: 20, name: "ETH", priceDecimals: 2, mobulaAsset: "Ethereum" },
  { id: 31, name: "SOL", priceDecimals: 3, mobulaAsset: "Solana" },
  { id: 10, name: "MON", priceDecimals: 6, mobulaAsset: "Monad" },
  { id: 40, name: "HYPE", priceDecimals: 3, mobulaAsset: "Hyperliquid" },
  { id: 50, name: "ZEC", priceDecimals: 2, mobulaAsset: "Zcash" },
];

export const DEFAULT_STRATEGY_PARAMS = {
  fastPeriod: 12,
  slowPeriod: 26,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  bollingerPeriod: 20,
  bollingerStdDev: 2,
  breakoutPeriod: 20,
  stochKPeriod: 14,
  stochDPeriod: 3,
  stochOversold: 20,
  stochOverbought: 80,
};

export const STRATEGY_META: {
  id: StrategyType;
  label: string;
  desc: string;
}[] = [
  { id: "ema_crossover", label: "EMA Crossover", desc: "12/26 — most popular on TradingView" },
  { id: "ma_crossover", label: "SMA Crossover", desc: "Classic golden / death cross" },
  { id: "rsi", label: "RSI", desc: "Overbought / oversold with exit at 50" },
  { id: "macd", label: "MACD", desc: "Line / signal crossover" },
  { id: "bollinger", label: "Bollinger Bands", desc: "Mean reversion on the bands" },
  { id: "breakout", label: "Breakout", desc: "Donchian channel breakout (Turtle)" },
  { id: "stochastic", label: "Stochastic", desc: "%K / %D — classic forex & crypto" },
];

export const MAX_CANDLES = 1024;
