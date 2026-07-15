"use client";

import { DEFAULT_STRATEGY_PARAMS, TIMEFRAME_SECONDS, isPairStrategy, MARKETS } from "@/lib/constants";
import {
  defaultPeriodConfig,
  type PeriodConfig,
} from "@/lib/period";
import type {
  BacktestResult,
  CandleFetchResult,
  StrategyParams,
  StrategyType,
  Timeframe,
} from "@/types";
import { computeReplayMetrics, findReplayStartIndex, tradesVisibleAt, replayTime } from "@/lib/replay-utils";
import { commitBacktestOnchain, type CommitOnchainInput } from "@/lib/commit-onchain";
import { saveCommitSnapshot, type StoredCommitSnapshot } from "@/lib/commit-snapshots";
import { saveLocalCommit } from "@/lib/commit-index";
import { executeBacktest, type BacktestRunInput } from "@/lib/run-backtest";
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

  const lastCandleDataRef = useRef<CandleFetchResult | null>(null);
  const lastPairMarketIdRef = useRef<number | undefined>(undefined);

  const retryCommit = useCallback(async () => {
    const input = lastCommitInputRef.current;
    if (!input || !wallet.address) {
      toast.error("Connect your wallet to retry the commit.");
      return;
    }

    setCommitStatus("committing");
    setLoading(true);
    setLoadingPhase("committing");
    toast.showLoading(LOADING_LABELS.committing, LOADING_HINTS.committing);
    startLoadingTimer();

    try {
      const committed = await commitBacktestOnchain(input);
      stopLoadingTimer();
      toast.hideLoading();
      setCommitStatus("success");
      setData(lastCandleDataRef.current);
      setResult(input.result);
      saveCommitSnapshot(input, lastPairMarketIdRef.current);
      if (wallet.address && lastCandleDataRef.current) {
        saveLocalCommit(wallet.address, {
          commitId: committed.commitId,
          txHash: committed.txHash,
          strategy: input.strategy,
          market: input.market,
          pnlUsd: input.result.metrics.totalPnl,
          committedAt: Math.floor(Date.now() / 1000),
          configHash: committed.configHash,
          resultHash: committed.resultHash,
        });
      }
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
    } finally {
      setLoading(false);
      setLoadingPhase("idle");
    }
  }, [wallet.address, toast, startLoadingTimer, stopLoadingTimer]);

  const applyRunInput = useCallback((input: BacktestRunInput) => {
    setMarketId(input.marketId);
    setPairMarketId(input.pairMarketId);
    setTimeframe(input.timeframe);
    setPeriod(input.period);
    setStrategy(input.strategy);
    setParams(input.params);
    setCapital(input.capital);
    setLeverage(input.leverage);
    setStopLoss(input.stopLoss);
    setTakeProfit(input.takeProfit);
    setFeeBps(input.feeBps);
    setEnableFunding(input.enableFunding);
    setFundingRateBps(input.fundingRateBps);
  }, []);

  const buildRunInput = useCallback(
    (): BacktestRunInput => ({
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
    }),
    [
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
    ]
  );

  const finishBacktestView = useCallback(
    (candleData: CandleFetchResult, btResult: BacktestResult, nextFeeBps: number, nextFundingBps: number) => {
      setFeeBps(nextFeeBps);
      setFundingRateBps(nextFundingBps);
      setData(candleData);
      setResult(btResult);
      setShowReplay(false);
      setReplayPlaying(false);
      setReplayIndex(0);
    },
    []
  );

  const runFromSnapshot = useCallback(
    async (snapshot: StoredCommitSnapshot) => {
      if (runInFlightRef.current) return;
      runInFlightRef.current = true;
      const runSeq = ++runSeqRef.current;

      const pairId =
        snapshot.pairMarketId ??
        (() => {
          if (!snapshot.market.includes("/")) return pairMarketId;
          const [, quote] = snapshot.market.split("/");
          return MARKETS.find((m) => m.name === quote)?.id ?? pairMarketId;
        })();

      const runInput: BacktestRunInput = {
        marketId: snapshot.marketId,
        pairMarketId: pairId,
        timeframe: snapshot.timeframe,
        period: snapshot.period,
        strategy: snapshot.strategy,
        params: snapshot.params,
        capital: snapshot.capital,
        leverage: snapshot.leverage,
        stopLoss: snapshot.stopLoss,
        takeProfit: snapshot.takeProfit,
        feeBps: snapshot.feeBps,
        enableFunding: snapshot.enableFunding,
        fundingRateBps: snapshot.fundingRateBps,
      };

      applyRunInput(runInput);
      setLoading(true);
      setLoadingPhase("fetching");
      setShowReplay(false);
      setReplayPlaying(false);
      setReplayIndex(0);
      setCommitStatus("idle");

      try {
        setLoadingPhase("computing");
        const { candleData, btResult, feeBps: fb, fundingRateBps: frb } = await executeBacktest(runInput);
        if (runSeq !== runSeqRef.current) return;
        finishBacktestView(candleData, btResult, fb, frb);
        toast.success(`Re-ran backtest · ${snapshot.strategy} · ${snapshot.market}`);
      } catch (e) {
        if (runSeq !== runSeqRef.current) return;
        toast.error(e instanceof Error ? e.message : "Backtest failed");
        setResult(null);
      } finally {
        if (runSeq === runSeqRef.current) {
          runInFlightRef.current = false;
          setLoading(false);
          setLoadingPhase("idle");
        }
      }
    },
    [applyRunInput, finishBacktestView, pairMarketId, toast]
  );

  const handleCommitSelect = useCallback(
    (snapshot: StoredCommitSnapshot) => {
      void runFromSnapshot(snapshot);
    },
    [runFromSnapshot]
  );

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
    setCommitStatus("idle");

    let reachedCommit = false;

    try {
      setLoadingPhase("computing");
      const runInput = buildRunInput();

      const { candleData, btResult, market, feeBps: fb, fundingRateBps: frb } =
        await executeBacktest(runInput);

      if (runSeq !== runSeqRef.current) return;

      lastCandleDataRef.current = candleData;
      lastPairMarketIdRef.current = isPairStrategy(strategy) ? pairMarketId : undefined;

      reachedCommit = true;
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
        feeBps: fb,
        enableFunding,
        fundingRateBps: frb,
        result: btResult,
      };
      lastCommitInputRef.current = commitInput;

      const committed = await commitBacktestOnchain(commitInput);
      if (runSeq !== runSeqRef.current) return;

      setCommitStatus("success");
      finishBacktestView(candleData, btResult, fb, frb);
      saveCommitSnapshot(commitInput, lastPairMarketIdRef.current);
      saveLocalCommit(wallet.address, {
        commitId: committed.commitId,
        txHash: committed.txHash,
        strategy: commitInput.strategy,
        market: commitInput.market,
        pnlUsd: btResult.metrics.totalPnl,
        committedAt: Math.floor(Date.now() / 1000),
        configHash: committed.configHash,
        resultHash: committed.resultHash,
      });
      toast.success("Backtest committed on Monad", {
        href: explorerTxUrl(committed.txHash),
        hrefLabel: "View tx",
      });
      setCommitsRefreshKey((k) => k + 1);
    } catch (e) {
      if (runSeq !== runSeqRef.current) return;
      const message = e instanceof Error ? e.message : "Unknown error";
      if (reachedCommit) {
        setCommitStatus("error");
        toast.error(message, {
          action: lastCommitInputRef.current
            ? { label: "Retry", onClick: () => void retryCommit() }
            : undefined,
        });
      } else {
        setCommitStatus("idle");
        toast.error(message);
      }
    } finally {
      if (runSeq === runSeqRef.current) {
        runInFlightRef.current = false;
        setLoading(false);
        setLoadingPhase("idle");
      }
    }
  }, [
    wallet.address,
    buildRunInput,
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
    enableFunding,
    finishBacktestView,
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
        onCommitSelect={handleCommitSelect}
      />
    </div>
  );
}
