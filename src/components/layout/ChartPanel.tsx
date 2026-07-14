"use client";

import { Button } from "@/components/ui";
import {
  CandlestickChart,
  MacdChart,
  RsiChart,
  StochasticChart,
} from "@/components/charts";
import { ReplayBar } from "@/components/ReplayBar";
import type { BacktestResult, Candle, StrategyParams, StrategyType } from "@/types";

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
  return (
    <section className="bt-main-panel p-3 flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-sm font-medium text-[var(--bt-label)]">Chart</h2>
        {canReplay && (
          <Button
            variant={showReplay ? "secondary" : "ghost"}
            onClick={onToggleReplay}
            className={`!w-auto !py-1.5 !px-3 !text-xs ${showReplay ? "!brightness-110" : ""}`}
          >
            {showReplay ? "Exit Replay" : "▶ Replay"}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {showReplay && result && candles.length > 0 && (
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
        )}

        {candles.length > 0 ? (
          <div className="flex flex-col gap-2">
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
