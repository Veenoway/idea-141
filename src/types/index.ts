export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TradeSide = "long" | "short";
export type ExitReason = "signal" | "stop_loss" | "take_profit" | "end";

export interface Trade {
  id: number;
  side: TradeSide;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  reason: ExitReason;
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export type StrategyType =
  | "ma_crossover"
  | "ema_crossover"
  | "rsi"
  | "macd"
  | "bollinger"
  | "breakout"
  | "stochastic";

export interface BacktestConfig {
  initialCapital: number;
  leverage: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  takerFeeBps: number;
  strategy: StrategyType;
  strategyParams: StrategyParams;
  enableFunding: boolean;
  fundingRateBps: number;
  fundingIntervalSec: number;
}

export interface FundingInfo {
  rateBps: number;
  intervalSec: number;
  takerFeeBps: number;
}

export interface StrategyParams {
  fastPeriod: number;
  slowPeriod: number;
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  bollingerPeriod: number;
  bollingerStdDev: number;
  breakoutPeriod: number;
  stochKPeriod: number;
  stochDPeriod: number;
  stochOversold: number;
  stochOverbought: number;
}

export interface BacktestMetrics {
  initialCapital: number;
  finalCapital: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  totalFunding: number;
}

export interface BacktestResult {
  trades: Trade[];
  equity: EquityPoint[];
  metrics: BacktestMetrics;
  events: ReplayEvent[];
}

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface MarketOption {
  id: number;
  name: string;
  priceDecimals: number;
  mobulaAsset: string;
}

export type DataSource = "perpl" | "mobula";

export interface CandleFetchResult {
  candles: Candle[];
  source: DataSource;
  market: string;
  funding?: FundingInfo;
}

export interface ReplayEvent {
  time: number;
  type: "long" | "short" | "close" | "stop_loss" | "take_profit" | "funding";
  label: string;
  amount?: number;
}
