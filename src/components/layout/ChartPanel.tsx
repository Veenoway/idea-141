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
  showReplay: boolean;
  replayIndex: number;
  replayPlaying: boolean;
  onReplayIndexChange: (i: number) => void;
  onReplayPlayingChange: (p: boolean) => void;
  onToggleReplay: () => void;
  canReplay: boolean;
}

export function ChartPanel({
  candles,
  result,
  strategy,
  params,
  sliceEnd,
  showReplay,
  replayIndex,
  replayPlaying,
  onReplayIndexChange,
  onReplayPlayingChange,
  onToggleReplay,
  canReplay,
}: Props) {
  return (
    <div className="flex flex-col shrink-0 bg-[var(--bt-bg)]">
      {showReplay && result && candles.length > 0 && (
        <ReplayBar
          candles={candles}
          result={result}
          index={replayIndex}
          onIndexChange={onReplayIndexChange}
          playing={replayPlaying}
          onPlayingChange={onReplayPlayingChange}
        />
      )}

      <div className="p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h2 className="text-sm font-medium text-[var(--bt-label)]">
            Chart
            {showReplay && (
              <span className="ml-2 text-[var(--bt-accent)] text-xs font-normal">· Replay mode</span>
            )}
          </h2>
          {canReplay && (
            <Button
              variant={showReplay ? "secondary" : "ghost"}
              onClick={onToggleReplay}
              className={`!w-auto !py-1.5 !px-3 !text-xs ${
                showReplay ? "!border-[var(--bt-accent)]/50 !text-[var(--bt-accent)] !bg-[var(--bt-accent-dim)]" : ""
              }`}
            >
              {showReplay ? "Exit Replay" : "▶ Replay"}
            </Button>
          )}
        </div>

        <div className="bt-panel p-3">
          {candles.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="h-[520px] shrink-0 rounded-md overflow-hidden">
                <CandlestickChart
                  candles={candles}
                  result={result}
                  strategy={strategy}
                  params={params}
                  sliceEnd={sliceEnd}
                />
              </div>
              {strategy === "rsi" && (
                <div className="h-[100px] shrink-0 border-t border-[var(--bt-border)] pt-2">
                  <RsiChart candles={candles} period={params.rsiPeriod} sliceEnd={sliceEnd} />
                </div>
              )}
              {strategy === "macd" && (
                <div className="h-[100px] shrink-0 border-t border-[var(--bt-border)] pt-2">
                  <MacdChart
                    candles={candles}
                    fast={params.macdFast}
                    slow={params.macdSlow}
                    signal={params.macdSignal}
                    sliceEnd={sliceEnd}
                  />
                </div>
              )}
              {strategy === "stochastic" && (
                <div className="h-[100px] shrink-0 border-t border-[var(--bt-border)] pt-2">
                  <StochasticChart
                    candles={candles}
                    kPeriod={params.stochKPeriod}
                    dPeriod={params.stochDPeriod}
                    sliceEnd={sliceEnd}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="h-[520px] flex items-center justify-center text-[var(--bt-muted)] text-sm text-center px-4">
              Connect wallet, configure strategy & run a backtest to see the chart
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
