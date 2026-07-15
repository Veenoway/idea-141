"use client";

import { ChartPanel } from "@/components/layout/ChartPanel";
import { EquityPanel } from "@/components/layout/EquityPanel";
import { LandingHero } from "@/components/layout/LandingHero";
import { StatsStrip } from "@/components/layout/StatsStrip";
import { TradeLog } from "@/components/layout/TradeLog";
import type { BacktestMetrics, BacktestResult, Candle, StrategyParams, StrategyType } from "@/types";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type View = "landing" | "results";

interface Props {
  result: BacktestResult | null;
  candles: Candle[];
  chartSeriesKey?: string;
  strategy: StrategyType;
  params: StrategyParams;
  sliceEnd?: number;
  sliceStart: number;
  showReplay: boolean;
  replayIndex: number;
  replayPlaying: boolean;
  onReplayIndexChange: (i: number) => void;
  onReplayPlayingChange: (p: boolean) => void;
  onToggleReplay: () => void;
  canReplay: boolean;
  barIntervalMs: number;
  displayMetrics: BacktestMetrics | null;
  visibleTrades: BacktestResult["trades"];
  fmt: (n: number, digits?: number) => string;
  walletConnected: boolean;
  loading: boolean;
  onConnectWallet: () => void;
  onRun: () => void;
}

const LANDING_EXIT_MS = 340;
const RESULTS_ENTER_MS = 720;
const REPLAY_PANEL_REFRESH_MS = 420;

export function MainWorkspace(props: Props) {
  const { result, showReplay } = props;
  const [view, setView] = useState<View>(result ? "results" : "landing");
  const [landingPhase, setLandingPhase] = useState<"idle" | "exit" | "enter">("idle");
  const [resultsPhase, setResultsPhase] = useState<"idle" | "enter">("idle");
  const [replayPanelsPhase, setReplayPanelsPhase] = useState<"idle" | "refresh">("idle");
  const prevShowReplay = useRef(showReplay);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  useEffect(() => {
    clearTimers();

    if (result && view === "landing") {
      setLandingPhase("exit");
      setResultsPhase("enter");
      schedule(() => {
        setView("results");
        setLandingPhase("idle");
      }, LANDING_EXIT_MS);
      schedule(() => setResultsPhase("idle"), LANDING_EXIT_MS + RESULTS_ENTER_MS);
      return clearTimers;
    }

    if (!result && view === "results") {
      setResultsPhase("idle");
      setLandingPhase("enter");
      schedule(() => setLandingPhase("idle"), RESULTS_ENTER_MS);
      setView("landing");
      return clearTimers;
    }

    return clearTimers;
  }, [result, view]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (prevShowReplay.current === showReplay) return;
    prevShowReplay.current = showReplay;
    if (!result) return;

    clearTimers();
    setReplayPanelsPhase("refresh");
    schedule(() => setReplayPanelsPhase("idle"), REPLAY_PANEL_REFRESH_MS);
    return clearTimers;
  }, [showReplay, result]);

  const replayPanelClass = replayPanelsPhase === "refresh" ? "bt-replay-panel-refresh" : "";

  const showLanding = view === "landing" || landingPhase === "exit";
  const showResults = !!result && (view === "results" || landingPhase === "exit");

  return (
    <div className="bt-workspace relative flex-1 min-h-0">
      {showLanding && (
        <div
          className={`bt-workspace-layer bt-workspace-layer--landing ${
            landingPhase === "exit" ? "bt-workspace-layer--exit" : ""
          } ${landingPhase === "enter" ? "bt-workspace-layer--enter" : ""}`}
        >
          <LandingHero />
        </div>
      )}

      {showResults && (
        <div
          className={`bt-workspace-layer bt-workspace-layer--results flex flex-col gap-2 overflow-y-auto perpl-scroll ${
            resultsPhase === "enter" ? "bt-workspace-layer--enter-results" : ""
          }`}
        >
          <RevealPiece delay={0}>
            <ChartPanel
              candles={props.candles}
              chartSeriesKey={props.chartSeriesKey}
              result={result}
              strategy={props.strategy}
              params={props.params}
              sliceEnd={props.sliceEnd}
              sliceStart={props.sliceStart}
              showReplay={props.showReplay}
              replayIndex={props.replayIndex}
              replayPlaying={props.replayPlaying}
              onReplayIndexChange={props.onReplayIndexChange}
              onReplayPlayingChange={props.onReplayPlayingChange}
              onToggleReplay={props.onToggleReplay}
              canReplay={props.canReplay}
              barIntervalMs={props.barIntervalMs}
            />
          </RevealPiece>

          {props.displayMetrics && (
            <RevealPiece delay={1} className={replayPanelClass}>
              <StatsStrip metrics={props.displayMetrics} fmt={props.fmt} />
            </RevealPiece>
          )}

          <RevealPiece delay={2} className={replayPanelClass}>
            <EquityPanel
              equity={result.equity}
              sliceEnd={props.sliceEnd}
              sliceStart={props.sliceStart}
            />
          </RevealPiece>

          {props.visibleTrades.length > 0 && (
            <RevealPiece delay={3} className={replayPanelClass}>
              <TradeLog
                trades={props.visibleTrades}
                fmt={props.fmt}
                replayActive={props.showReplay}
              />
            </RevealPiece>
          )}
        </div>
      )}
    </div>
  );
}

function RevealPiece({
  delay,
  className = "",
  children,
}: {
  delay: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`bt-reveal-piece ${className}`.trim()}
      style={{ "--reveal-delay": `${80 + delay * 70}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
