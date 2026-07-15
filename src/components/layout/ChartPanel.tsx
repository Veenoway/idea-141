"use client";

import { Button } from "@/components/ui";
import {
  CandlestickChart,
  MacdChart,
  RsiChart,
  StochasticChart,
} from "@/components/charts";
import { ReplayBar } from "@/components/ReplayBar";
import { isPairStrategy, STRATEGY_META } from "@/lib/constants";
import type { BacktestResult, Candle, StrategyParams, StrategyType } from "@/types";
import { useEffect, useRef, useState } from "react";

interface Props {
  candles: Candle[];
  result: BacktestResult | null;
  strategy: StrategyType;
  params: StrategyParams;
  sliceEnd?: number;
  sliceStart?: number;
  showReplay: boolean;
  replayIndex: number;
  replayPlaying: boolean;
  onReplayIndexChange: (i: number) => void;
  onReplayPlayingChange: (p: boolean) => void;
  onToggleReplay: () => void;
  canReplay: boolean;
  barIntervalMs: number;
}

const REPLAY_ENTER_MS = 320;
const REPLAY_EXIT_MS = 260;

export function ChartPanel({
  candles,
  result,
  strategy,
  params,
  sliceEnd,
  sliceStart = 0,
  showReplay,
  replayIndex,
  replayPlaying,
  onReplayIndexChange,
  onReplayPlayingChange,
  onToggleReplay,
  canReplay,
  barIntervalMs,
}: Props) {
  const strategyLabel =
    STRATEGY_META.find((s) => s.id === strategy)?.label ?? strategy;
  const [replayBarMounted, setReplayBarMounted] = useState(showReplay);
  const [replayBarPhase, setReplayBarPhase] = useState<"idle" | "enter" | "exit">("idle");
  const [replayModePhase, setReplayModePhase] = useState<"idle" | "enter" | "exit">("idle");
  const prevShowReplay = useRef(showReplay);
  const timersRef = useRef<number[]>([]);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (!showReplay || !replayPlaying) return;

    viewportRef.current = { w: window.innerWidth, h: window.innerHeight };

    const onResize = () => {
      const dw = Math.abs(window.innerWidth - viewportRef.current.w);
      const dh = Math.abs(window.innerHeight - viewportRef.current.h);
      if (dw < 24 && dh < 24) return;
      viewportRef.current = { w: window.innerWidth, h: window.innerHeight };
      onReplayPlayingChange(false);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [showReplay, replayPlaying, onReplayPlayingChange]);

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => {
    if (prevShowReplay.current === showReplay) return;
    prevShowReplay.current = showReplay;

    clearTimers();

    if (showReplay) {
      setReplayBarMounted(true);
      setReplayBarPhase("enter");
      setReplayModePhase("enter");
      schedule(() => {
        setReplayBarPhase("idle");
        setReplayModePhase("idle");
      }, REPLAY_ENTER_MS);
    } else {
      setReplayBarPhase("exit");
      setReplayModePhase("exit");
      schedule(() => {
        setReplayBarMounted(false);
        setReplayBarPhase("idle");
        setReplayModePhase("idle");
      }, REPLAY_EXIT_MS);
    }

    return clearTimers;
  }, [showReplay]);

  useEffect(() => () => clearTimers(), []);

  return (
    <section className="bt-main-panel p-3 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-sm font-medium text-[var(--bt-label)]">
          {isPairStrategy(strategy) ? `${strategyLabel} · base ÷ quote` : strategyLabel}
        </h2>
        {canReplay && (
          <Button
            variant={showReplay ? "secondary" : "primary"}
            onClick={onToggleReplay}
            className="!w-auto !py-1.5 !px-3 !text-xs"
          >
            {showReplay ? "Exit Replay" : "▶ Replay"}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {replayBarMounted && result && candles.length > 0 && (
          <div
            className={`bt-replay-bar overflow-hidden ${
              replayBarPhase === "enter" ? "bt-replay-bar--enter" : ""
            } ${replayBarPhase === "exit" ? "bt-replay-bar--exit" : ""}`}
          >
            <ReplayBar
              candles={candles}
              result={result}
              index={replayIndex}
              startIndex={sliceStart}
              barIntervalMs={barIntervalMs}
              onIndexChange={onReplayIndexChange}
              playing={replayPlaying}
              onPlayingChange={onReplayPlayingChange}
            />
          </div>
        )}

        {candles.length > 0 ? (
          <div
            ref={chartWrapRef}
            className={`flex flex-col gap-2 bt-replay-chart-wrap ${
              replayModePhase === "enter" ? "bt-replay-chart-wrap--enter" : ""
            } ${replayModePhase === "exit" ? "bt-replay-chart-wrap--exit" : ""} ${
              showReplay ? "bt-replay-chart-wrap--active" : ""
            }`}
          >
            <div className="h-[520px] shrink-0 bt-chart-well">
              <CandlestickChart
                candles={candles}
                result={result}
                strategy={strategy}
                params={params}
                sliceEnd={sliceEnd}
                sliceStart={sliceStart}
              />
            </div>
            {strategy === "rsi" && (
              <div className="h-[100px] shrink-0 bt-chart-well">
                <RsiChart candles={candles} period={params.rsiPeriod} sliceEnd={sliceEnd} sliceStart={sliceStart} />
              </div>
            )}
            {strategy === "macd" && (
              <div className="h-[100px] shrink-0 bt-chart-well">
                <MacdChart
                  candles={candles}
                  fast={params.macdFast}
                  slow={params.macdSlow}
                  signal={params.macdSignal}
                  sliceEnd={sliceEnd}
                  sliceStart={sliceStart}
                />
              </div>
            )}
            {strategy === "stochastic" && (
              <div className="h-[100px] shrink-0 bt-chart-well">
                <StochasticChart
                  candles={candles}
                  kPeriod={params.stochKPeriod}
                  dPeriod={params.stochDPeriod}
                  sliceEnd={sliceEnd}
                  sliceStart={sliceStart}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="h-[520px] bt-chart-well flex items-center justify-center text-[var(--bt-muted)] text-sm text-center px-3">
            Connect wallet, configure strategy & run a backtest to see the chart
          </div>
        )}
      </div>
    </section>
  );
}
