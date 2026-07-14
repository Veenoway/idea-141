"use client";

import { DEFAULT_STRATEGY_PARAMS } from "@/lib/constants";
import {
  buildCandlesQuery,
  defaultPeriodConfig,
  type PeriodConfig,
} from "@/lib/period";
import type {
  BacktestConfig,
  BacktestResult,
  CandleFetchResult,
  StrategyParams,
  StrategyType,
  Timeframe,
} from "@/types";
import { runBacktest } from "@/lib/backtest/engine";
import { computeReplayMetrics, tradesVisibleAt, replayTime } from "@/lib/replay-utils";
import { commitBacktestOnchain, type CommitOnchainInput } from "@/lib/commit-onchain";
import { MARKETS } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import type { CommitStatus } from "@/types/onchain";
import { ChartPanel } from "@/components/layout/ChartPanel";
import { EquityPanel } from "@/components/layout/EquityPanel";
import { RightDrawer } from "@/components/layout/RightDrawer";
import { StatsStrip } from "@/components/layout/StatsStrip";
import { TopBar } from "@/components/layout/TopBar";
import { TradeLog } from "@/components/layout/TradeLog";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { MarketIconsProvider } from "@/hooks/useMarketIcons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LoadingPhase = "fetching" | "computing" | "committing" | "idle";

function fmt(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function BacktestApp() {
  const wallet = useWallet();
  const [marketId, setMarketId] = useState(1);
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [period, setPeriod] = useState<PeriodConfig>(defaultPeriodConfig);
  const [strategy, setStrategy] = useState<StrategyType>("ema_crossover");
  const [params, setParams] = useState<StrategyParams>(DEFAULT_STRATEGY_PARAMS);
  const [capital, setCapital] = useState(10_000);
  const [leverage, setLeverage] = useState(5);
  const [stopLoss, setStopLoss] = useState(2);
  const [takeProfit, setTakeProfit] = useState(4);
  const [feeBps, setFeeBps] = useState(6.9);
  const [enableFunding, setEnableFunding] = useState(true);
  const [fundingRateBps, setFundingRateBps] = useState(0.2);

  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CandleFetchResult | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);

  const [commitStatus, setCommitStatus] = useState<CommitStatus>("idle");
  const [commitTxHash, setCommitTxHash] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitsRefreshKey, setCommitsRefreshKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const lastCommitInputRef = useRef<CommitOnchainInput | null>(null);

  useEffect(() => {
    if (!loading) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const run = useCallback(async () => {
    if (!wallet.address) return;

    setLoading(true);
    setLoadingPhase("fetching");
    setElapsedMs(0);
    setError(null);
    setShowReplay(false);
    setReplayPlaying(false);
    setReplayIndex(0);
    setCommitStatus("idle");
    setCommitTxHash(null);
    setCommitError(null);

    try {
      const url = buildCandlesQuery(marketId, timeframe, period);
      const res = await fetch(url);
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? `Fetch failed (${res.status})`);
      }

      const candleData: CandleFetchResult = body;
      if (candleData.candles.length < 50) {
        throw new Error("Not enough candle data for backtest (min 50)");
      }

      if (candleData.funding) {
        setFeeBps(candleData.funding.takerFeeBps);
        setFundingRateBps(candleData.funding.rateBps);
      }

      setData(candleData);
      setLoadingPhase("computing");
      await new Promise((r) => setTimeout(r, 30));

      const config: BacktestConfig = {
        initialCapital: capital,
        leverage,
        stopLossPercent: stopLoss,
        takeProfitPercent: takeProfit,
        takerFeeBps: candleData.funding?.takerFeeBps ?? feeBps,
        strategy,
        strategyParams: params,
        enableFunding,
        fundingRateBps: candleData.funding?.rateBps ?? fundingRateBps,
        fundingIntervalSec: candleData.funding?.intervalSec ?? 3600,
      };
      const btResult = runBacktest(candleData.candles, config);
      setResult(btResult);

      const market =
        MARKETS.find((m) => m.id === marketId)?.name ?? "UNKNOWN";

      setLoadingPhase("committing");
      setCommitStatus("committing");
      const commitInput: CommitOnchainInput = {
        walletAddress: wallet.address,
        marketId,
        market,
        timeframe,
        period,
        strategy,
        params,
        capital,
        leverage,
        stopLoss,
        takeProfit,
        feeBps: candleData.funding?.takerFeeBps ?? feeBps,
        enableFunding,
        fundingRateBps: candleData.funding?.rateBps ?? fundingRateBps,
        result: btResult,
      };
      lastCommitInputRef.current = commitInput;
      try {
        const committed = await commitBacktestOnchain(commitInput);
        setCommitStatus("success");
        setCommitTxHash(committed.txHash);
        setCommitsRefreshKey((k) => k + 1);
      } catch (e) {
        setCommitStatus("error");
        setCommitError(e instanceof Error ? e.message : "Onchain commit failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setResult(null);
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  }, [
    wallet.address,
    marketId,
    timeframe,
    period,
    strategy,
    params,
    capital,
    leverage,
    stopLoss,
    takeProfit,
    feeBps,
    enableFunding,
    fundingRateBps,
  ]);

  const retryCommit = useCallback(async () => {
    const input = lastCommitInputRef.current;
    if (!input || !wallet.address) return;

    setCommitStatus("committing");
    setCommitError(null);
    setCommitTxHash(null);
    try {
      const committed = await commitBacktestOnchain(input);
      setCommitStatus("success");
      setCommitTxHash(committed.txHash);
      setCommitsRefreshKey((k) => k + 1);
    } catch (e) {
      setCommitStatus("error");
      setCommitError(e instanceof Error ? e.message : "Onchain commit failed");
    }
  }, [wallet.address]);

  const toggleReplay = () => {
    setShowReplay((prev) => {
      if (prev) {
        setReplayPlaying(false);
        return false;
      }
      setReplayIndex(0);
      setReplayPlaying(true);
      return true;
    });
  };

  const candles = useMemo(() => data?.candles ?? [], [data]);
  const sliceEnd = showReplay && result ? replayIndex : undefined;
  const canReplay = !!result && candles.length > 0;

  const displayMetrics = useMemo(() => {
    if (!result) return null;
    if (showReplay && sliceEnd != null) {
      return computeReplayMetrics(result, candles, sliceEnd);
    }
    return result.metrics;
  }, [result, showReplay, sliceEnd, candles]);

  const visibleTrades = useMemo(() => {
    if (!result) return [];
    if (showReplay && sliceEnd != null) {
      return tradesVisibleAt(result, replayTime(candles, sliceEnd));
    }
    return result.trades;
  }, [result, showReplay, sliceEnd, candles]);

  return (
    <MarketIconsProvider>
    <div className="min-h-screen flex bg-[var(--bt-bg)] text-[var(--bt-text)]">
      <LoadingOverlay active={loading} phase={loadingPhase} elapsedMs={elapsedMs} />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <TopBar
          marketId={marketId}
          timeframe={timeframe}
          period={period}
          data={data}
          candleCount={candles.length}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto perpl-scroll p-2">
          <ChartPanel
            candles={candles}
            result={result}
            strategy={strategy}
            params={params}
            sliceEnd={sliceEnd}
            showReplay={showReplay}
            replayIndex={replayIndex}
            replayPlaying={replayPlaying}
            onReplayIndexChange={setReplayIndex}
            onReplayPlayingChange={setReplayPlaying}
            onToggleReplay={toggleReplay}
            canReplay={canReplay}
          />

          {displayMetrics && <StatsStrip metrics={displayMetrics} fmt={fmt} />}
          {result && <EquityPanel equity={result.equity} sliceEnd={sliceEnd} />}
          {visibleTrades.length > 0 && (
            <TradeLog trades={visibleTrades} fmt={fmt} replayActive={showReplay} />
          )}
        </div>
      </div>

      <RightDrawer
        marketId={marketId}
        onMarketChange={setMarketId}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        period={period}
        onPeriodChange={setPeriod}
        strategy={strategy}
        onStrategyChange={setStrategy}
        params={params}
        onParamsChange={setParams}
        capital={capital}
        onCapitalChange={setCapital}
        leverage={leverage}
        onLeverageChange={setLeverage}
        stopLoss={stopLoss}
        onStopLossChange={setStopLoss}
        takeProfit={takeProfit}
        onTakeProfitChange={setTakeProfit}
        feeBps={feeBps}
        onFeeBpsChange={setFeeBps}
        enableFunding={enableFunding}
        onEnableFundingChange={setEnableFunding}
        fundingRateBps={fundingRateBps}
        onFundingRateBpsChange={setFundingRateBps}
        loading={loading}
        onRun={run}
        hasResult={!!result}
        showReplay={showReplay}
        onToggleReplay={toggleReplay}
        error={error}
        walletAddress={wallet.address}
        walletConnecting={wallet.connecting}
        walletError={wallet.error}
        onConnectWallet={wallet.connect}
        commitStatus={commitStatus}
        commitError={commitError}
        commitTxHash={commitTxHash}
        onRetryCommit={retryCommit}
        commitsRefreshKey={commitsRefreshKey}
      />
    </div>
    </MarketIconsProvider>
  );
}
