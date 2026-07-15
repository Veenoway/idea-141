import { MARKETS, isPairStrategy } from "@/lib/constants";
import { buildCandlesQuery } from "@/lib/period";
import { runBacktest } from "@/lib/backtest/engine";
import { alignPairCandles } from "@/lib/backtest/pair-utils";
import { runPairBacktest } from "@/lib/backtest/pair-engine";
import type {
  BacktestConfig,
  BacktestResult,
  CandleFetchResult,
  StrategyParams,
  StrategyType,
  Timeframe,
} from "@/types";
import type { PeriodConfig } from "@/lib/period";

export interface BacktestRunInput {
  marketId: number;
  pairMarketId: number;
  timeframe: Timeframe;
  period: PeriodConfig;
  strategy: StrategyType;
  params: StrategyParams;
  capital: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  feeBps: number;
  enableFunding: boolean;
  fundingRateBps: number;
}

export interface BacktestRunOutput {
  candleData: CandleFetchResult;
  btResult: BacktestResult;
  config: BacktestConfig;
  market: string;
  feeBps: number;
  fundingRateBps: number;
}

export async function executeBacktest(input: BacktestRunInput): Promise<BacktestRunOutput> {
  const pairMode = isPairStrategy(input.strategy);
  if (pairMode && input.pairMarketId === input.marketId) {
    throw new Error("Pick two different assets for the pair (e.g. BTC / ETH).");
  }

  const url = buildCandlesQuery(input.marketId, input.timeframe, input.period);
  const quoteUrl = pairMode ? buildCandlesQuery(input.pairMarketId, input.timeframe, input.period) : null;

  const fetches = [fetch(url), ...(quoteUrl ? [fetch(quoteUrl)] : [])] as const;
  const responses = await Promise.all(fetches);
  const bodies = await Promise.all(responses.map((r) => r.json()));

  const baseRes = bodies[0];
  if (!responses[0].ok) {
    throw new Error(baseRes.error ?? `Fetch failed (${responses[0].status})`);
  }

  let candleData: CandleFetchResult = baseRes;

  const config: BacktestConfig = {
    initialCapital: input.capital,
    leverage: input.leverage,
    stopLossPercent: input.stopLoss,
    takeProfitPercent: input.takeProfit,
    takerFeeBps: candleData.funding?.takerFeeBps ?? input.feeBps,
    strategy: input.strategy,
    strategyParams: input.params,
    enableFunding: input.enableFunding,
    fundingRateBps: candleData.funding?.rateBps ?? input.fundingRateBps,
    fundingIntervalSec: candleData.funding?.intervalSec ?? 3600,
  };

  let btResult: BacktestResult;

  if (pairMode) {
    const quoteRes = bodies[1];
    if (!responses[1].ok) {
      throw new Error(quoteRes.error ?? `Quote fetch failed (${responses[1].status})`);
    }

    const baseName = MARKETS.find((m) => m.id === input.marketId)?.name ?? "BASE";
    const quoteName = MARKETS.find((m) => m.id === input.pairMarketId)?.name ?? "QUOTE";
    const series = alignPairCandles(baseRes.candles, quoteRes.candles);

    if (series.ratio.length < 50) {
      throw new Error("Not enough aligned pair data for backtest (min 50 bars).");
    }

    if (quoteRes.funding && !candleData.funding) {
      config.takerFeeBps = quoteRes.funding.takerFeeBps;
      config.fundingRateBps = quoteRes.funding.rateBps;
      config.fundingIntervalSec = quoteRes.funding.intervalSec;
    }

    candleData = {
      candles: series.ratio,
      source: baseRes.source === "perpl" && quoteRes.source === "perpl" ? "perpl" : "mobula",
      market: `${baseName}/${quoteName}`,
      funding: candleData.funding ?? quoteRes.funding,
      pair: {
        baseMarket: baseName,
        quoteMarket: quoteName,
        baseMarketId: input.marketId,
        quoteMarketId: input.pairMarketId,
      },
    };

    btResult = runPairBacktest({
      series,
      config,
      baseSymbol: baseName,
      quoteSymbol: quoteName,
    });
  } else {
    if (candleData.candles.length < 50) {
      throw new Error("Not enough candle data for backtest (min 50)");
    }
    btResult = runBacktest(candleData.candles, config);
  }

  const market = candleData.market;
  const feeBps = candleData.funding?.takerFeeBps ?? input.feeBps;
  const fundingRateBps = candleData.funding?.rateBps ?? input.fundingRateBps;

  return { candleData, btResult, config, market, feeBps, fundingRateBps };
}
