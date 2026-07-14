"use client";

import { DEFAULT_STRATEGY_PARAMS, TIMEFRAME_SECONDS, isPairStrategy, MARKETS } from "@/lib/constants";
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
import { alignPairCandles } from "@/lib/backtest/pair-utils";
import { runPairBacktest } from "@/lib/backtest/pair-engine";
import { computeReplayMetrics, findReplayStartIndex, tradesVisibleAt, replayTime } from "@/lib/replay-utils";
import { commitBacktestOnchain, type CommitOnchainInput } from "@/lib/commit-onchain";
import { explorerTxUrl } from "@/lib/chain";
import { useWallet } from "@/hooks/useWallet";
import { ToastProvider, useToast } from "@/hooks/useToast";
import type { CommitStatus } from "@/types/onchain";
import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { RightDrawer } from "@/components/layout/RightDrawer";
import { TopBar } from "@/components/layout/TopBar";
import { MarketIconsProvider } from "@/hooks/useMarketIcons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LoadingPhase = "fetching" | "computing" | "committing" | "idle";

const LOADING_LABELS: Record<Exclude<LoadingPhase, "idle">, string> = {
  fetching: "Fetching market data…",
  computing: "Running backtest simulation…",
  committing: "Committing result on Monad…",
};

const LOADING_HINTS: Record<Exclude<LoadingPhase, "idle">, string> = {
  fetching: "Cached after first load · retry on 429",
  computing: "Calculating indicators & trades",
  committing: "Confirm the transaction in your wallet",
};

function fmt(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function BacktestApp() {
  return (
    <ToastProvider>
      <MarketIconsProvider>
        <BacktestAppInner />
      </MarketIconsProvider>
    </ToastProvider>
  );
}

function BacktestAppInner() {
  const wallet = useWallet();
  const toast = useToast();
  const [marketId, setMarketId] = useState(1);
  const [pairMarketId, setPairMarketId] = useState(20);
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
  const [data, setData] = useState<CandleFetchResult | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);

  const [commitStatus, setCommitStatus] = useState<CommitStatus>("idle");
  const [commitsRefreshKey, setCommitsRefreshKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const lastCommitInputRef = useRef<CommitOnchainInput | null>(null);
  const runInFlightRef = useRef(false);
  const runSeqRef = useRef(0);
  const lastWalletErrorRef = useRef<string | null>(null);

  const startLoadingTimer = useCallback(() => {
    startRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      toast.updateLoading({ elapsedMs: Date.now() - startRef.current });
    }, 100);
  }, [toast]);

  const stopLoadingTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (!loading) {
      toast.hideLoading();
      stopLoadingTimer();
      return;
    }

    toast.showLoading(LOADING_LABELS.fetching, LOADING_HINTS.fetching);
    startLoadingTimer();

    return stopLoadingTimer;
  }, [loading, toast, startLoadingTimer, stopLoadingTimer]);

  useEffect(() => {
    if (!loading || loadingPhase === "idle") return;
    toast.updateLoading({
      message: LOADING_LABELS[loadingPhase],
      hint: LOADING_HINTS[loadingPhase],
    });
  }, [loading, loadingPhase, toast]);

  useEffect(() => {
    if (!wallet.error || wallet.error === lastWalletErrorRef.current) return;
    lastWalletErrorRef.current = wallet.error;
    toast.error(wallet.error);
  }, [wallet.error, toast]);

  const retryCommit = useCallback(async () => {
    const input = lastCommitInputRef.current;
    if (!input || !wallet.address) {
      toast.error("Connect your wallet to retry the commit.");
      return;
    }

    setCommitStatus("committing");
    toast.showLoading(LOADING_LABELS.committing, LOADING_HINTS.committing);
    startLoadingTimer();

    try {
      const committed = await commitBacktestOnchain(input);
      stopLoadingTimer();
      toast.hideLoading();
      setCommitStatus("success");
      toast.success("Backtest committed on Monad", {
        href: explorerTxUrl(committed.txHash),
        hrefLabel: "View tx",
      });
      setCommitsRefreshKey((k) => k + 1);
    } catch (e) {
      stopLoadingTimer();
      toast.hideLoading();
      setCommitStatus("error");
      const message = e instanceof Error ? e.message : "Onchain commit failed";
      toast.error(message, {
        action: { label: "Retry", onClick: () => void retryCommit() },
      });
    }
  }, [wallet.address, toast, startLoadingTimer, stopLoadingTimer]);

  const run = useCallback(async () => {
    if (!wallet.address) {
      toast.error("Connect your wallet to run a backtest.");
      return;
    }
    if (runInFlightRef.current) return;

    runInFlightRef.current = true;
    const runSeq = ++runSeqRef.current;

    setLoading(true);
    setLoadingPhase("fetching");
    setShowReplay(false);
    setReplayPlaying(false);
    setReplayIndex(0);
    setCommitStatus("idle");

    try {
      const pairMode = isPairStrategy(strategy);
      if (pairMode && pairMarketId === marketId) {
        throw new Error("Pick two different assets for the pair (e.g. BTC / ETH).");
      }

      const url = buildCandlesQuery(marketId, timeframe, period);
      const quoteUrl = pairMode ? buildCandlesQuery(pairMarketId, timeframe, period) : null;

      const fetches = [fetch(url), ...(quoteUrl ? [fetch(quoteUrl)] : [])] as const;
      const responses = await Promise.all(fetches);
      const bodies = await Promise.all(responses.map((r) => r.json()));

      const baseRes = bodies[0];
      if (!responses[0].ok) {
        throw new Error(baseRes.error ?? `Fetch failed (${responses[0].status})`);
      }

      let candleData: CandleFetchResult = baseRes;

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

      let btResult: BacktestResult;

      if (pairMode) {
        const quoteRes = bodies[1];
        if (!responses[1].ok) {
          throw new Error(quoteRes.error ?? `Quote fetch failed (${responses[1].status})`);
        }

        const baseName = MARKETS.find((m) => m.id === marketId)?.name ?? "BASE";
        const quoteName = MARKETS.find((m) => m.id === pairMarketId)?.name ?? "QUOTE";
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
            baseMarketId: marketId,
            quoteMarketId: pairMarketId,
          },
        };

        setLoadingPhase("computing");
        await new Promise((r) => setTimeout(r, 30));

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

        setLoadingPhase("computing");
        await new Promise((r) => setTimeout(r, 30));

        btResult = runBacktest(candleData.candles, config);
      }

      if (candleData.funding) {
        setFeeBps(candleData.funding.takerFeeBps);
        setFundingRateBps(candleData.funding.rateBps);
      }

      setData(candleData);
      setResult(btResult);

      const market = candleData.market;

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
        if (runSeq !== runSeqRef.current) return;
        setCommitStatus("success");
        toast.success("Backtest committed on Monad", {
          href: explorerTxUrl(committed.txHash),
          hrefLabel: "View tx",
        });
        setCommitsRefreshKey((k) => k + 1);
      } catch (e) {
        if (runSeq !== runSeqRef.current) return;
        setCommitStatus("error");
        const message = e instanceof Error ? e.message : "Onchain commit failed";
        toast.error(message, {
          action: { label: "Retry", onClick: () => void retryCommit() },
        });
      }
    } catch (e) {
      if (runSeq !== runSeqRef.current) return;
      setCommitStatus("idle");
      toast.error(e instanceof Error ? e.message : "Unknown error");
      setResult(null);
    } finally {
      if (runSeq === runSeqRef.current) {
        runInFlightRef.current = false;
        setLoading(false);
        setLoadingPhase("idle");
      }
    }
  }, [
    wallet.address,
    marketId,
    pairMarketId,
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
    toast,
    retryCommit,
  ]);

  const toggleReplay = () => {
    setShowReplay((prev) => {
      if (prev) {
        setReplayPlaying(false);
        return false;
      }
      setReplayIndex(replayStartIndex);
      setReplayPlaying(true);
      return true;
    });
  };

  const candles = useMemo(() => data?.candles ?? [], [data]);
  const barIntervalMs = TIMEFRAME_SECONDS[timeframe] * 1000;
  const replayStartIndex = useMemo(
    () => findReplayStartIndex(candles, barIntervalMs),
    [candles, barIntervalMs]
  );
  const sliceStart = showReplay ? replayStartIndex : 0;
  const sliceEnd = showReplay && result ? replayIndex : undefined;
  const canReplay = !!result && candles.length > replayStartIndex;

  useEffect(() => {
    if (showReplay && replayIndex < replayStartIndex) {
      setReplayIndex(replayStartIndex);
    }
  }, [showReplay, replayIndex, replayStartIndex]);

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
    <div className="min-h-screen flex bg-[var(--bt-bg)] text-[var(--bt-text)]">
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <TopBar
          marketId={marketId}
          timeframe={timeframe}
          period={period}
          data={data}
          candleCount={candles.length}
        />

        <div className="flex-1 min-h-0 flex flex-col p-2">
          <MainWorkspace
            result={result}
            candles={candles}
            strategy={strategy}
            params={params}
            sliceEnd={sliceEnd}
            sliceStart={sliceStart}
            showReplay={showReplay}
            replayIndex={replayIndex}
            replayPlaying={replayPlaying}
            onReplayIndexChange={setReplayIndex}
            onReplayPlayingChange={setReplayPlaying}
            onToggleReplay={toggleReplay}
            canReplay={canReplay}
            barIntervalMs={barIntervalMs}
            displayMetrics={displayMetrics}
            visibleTrades={visibleTrades}
            fmt={fmt}
            walletConnected={!!wallet.address}
            loading={loading}
            onConnectWallet={wallet.connect}
            onRun={run}
          />
        </div>
      </div>

      <RightDrawer
        marketId={marketId}
        onMarketChange={setMarketId}
        pairMarketId={pairMarketId}
        onPairMarketChange={setPairMarketId}
        onApplyPairPreset={(baseId, quoteId) => {
          setMarketId(baseId);
          setPairMarketId(quoteId);
        }}
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
        walletAddress={wallet.address}
        walletConnecting={wallet.connecting}
        onConnectWallet={wallet.connect}
        commitStatus={commitStatus}
        onRetryCommit={retryCommit}
        commitsRefreshKey={commitsRefreshKey}
      />
    </div>
  );
}
