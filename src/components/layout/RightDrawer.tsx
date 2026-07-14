"use client";

import { MARKETS, STRATEGY_META } from "@/lib/constants";
import { MarketIcon } from "@/components/MarketIcon";
import { PeriodSelector } from "@/components/PeriodSelector";
import { OnchainTab } from "@/components/layout/OnchainTab";
import {
  Accordion,
  AccordionGroup,
  Alert,
  Button,
  NumInput,
  SegmentedControl,
  SelectMenu,
  Toggle,
  WalletPill,
} from "@/components/ui";
import { resolvePeriodMs, type PeriodConfig } from "@/lib/period";
import type { CommitStatus } from "@/types/onchain";
import type { StrategyParams, StrategyType, Timeframe } from "@/types";
import { useMemo, useState } from "react";

const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d"];

type DrawerTab = "setup" | "onchain";

interface Props {
  marketId: number;
  onMarketChange: (id: number) => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  period: PeriodConfig;
  onPeriodChange: (p: PeriodConfig) => void;
  strategy: StrategyType;
  onStrategyChange: (s: StrategyType) => void;
  params: StrategyParams;
  onParamsChange: (p: StrategyParams) => void;
  capital: number;
  onCapitalChange: (v: number) => void;
  leverage: number;
  onLeverageChange: (v: number) => void;
  stopLoss: number;
  onStopLossChange: (v: number) => void;
  takeProfit: number;
  onTakeProfitChange: (v: number) => void;
  feeBps: number;
  onFeeBpsChange: (v: number) => void;
  enableFunding: boolean;
  onEnableFundingChange: (v: boolean) => void;
  fundingRateBps: number;
  onFundingRateBpsChange: (v: number) => void;
  loading: boolean;
  onRun: () => void;
  hasResult: boolean;
  showReplay: boolean;
  onToggleReplay: () => void;
  error: string | null;
  walletAddress: string | null;
  walletConnecting: boolean;
  walletError: string | null;
  onConnectWallet: () => void;
  commitStatus: CommitStatus;
  commitError: string | null;
  commitTxHash: string | null;
  onRetryCommit: () => void;
  commitsRefreshKey: number;
}

export function RightDrawer(props: Props) {
  const [tab, setTab] = useState<DrawerTab>("setup");
  const showOnchainDot = props.commitStatus === "error";

  const strategyLabel =
    STRATEGY_META.find((s) => s.id === props.strategy)?.label ?? props.strategy;
  const marketName = MARKETS.find((m) => m.id === props.marketId)?.name ?? "—";
  const { days } = resolvePeriodMs(props.period);
  const periodSummary =
    props.period.mode === "days"
      ? `${days} days`
      : `${props.period.fromDate} → ${props.period.toDate}`;

  const marketSummary = useMemo(
    () => `${marketName} · ${props.timeframe.toUpperCase()}`,
    [marketName, props.timeframe]
  );

  const riskSummary = `$${props.capital.toLocaleString()} · ${props.leverage}x · SL ${props.stopLoss}%`;

  return (
    <aside className="bt-drawer w-[320px] shrink-0 h-screen sticky top-0 flex flex-col bg-[var(--paper-2)] shadow-[var(--paper-shadow-drawer)] z-20">
      <div className="shrink-0 px-3 py-3 border-b border-white/[0.03]">
        <h2 className="text-sm font-semibold text-white tracking-tight">Configuration</h2>
        <p className="text-[11px] text-[var(--bt-muted)] mt-1">Strategy · Market · Risk · Onchain</p>
      </div>

      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-white/[0.03]">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "setup" as const, label: "Setup" },
            {
              value: "onchain" as const,
              label: showOnchainDot ? "Onchain ●" : "Onchain",
            },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto perpl-scroll">
        {tab === "setup" ? (
          <>
            <AccordionGroup>
              <Accordion title="Strategy" summary={strategyLabel} defaultOpen>
                <div className="space-y-2">
                  {STRATEGY_META.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => props.onStrategyChange(s.id)}
                      className={`drawer-control w-full text-left rounded-[var(--bt-radius-sm)] py-2 transition-[filter,box-shadow] ${
                        props.strategy === s.id
                          ? "drawer-control-selected pl-[calc(0.625rem-2px)] pr-2.5 border-l-[3px] border-l-white/50"
                          : "px-2.5"
                      }`}
                    >
                      <span
                        className={`block text-xs text-white ${
                          props.strategy === s.id ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {s.label}
                      </span>
                      <span
                        className={`block text-[10px] leading-snug mt-0.5 ${
                          props.strategy === s.id ? "text-[var(--bt-label)]" : "text-[var(--bt-muted)]"
                        }`}
                      >
                        {s.desc}
                      </span>
                    </button>
                  ))}
                </div>
                <StrategyParamsForm
                  strategy={props.strategy}
                  params={props.params}
                  onChange={props.onParamsChange}
                />
              </Accordion>

              <Accordion title="Market" summary={marketSummary}>
                <div className="space-y-3">
                <SelectMenu
                  label="Asset"
                  value={String(props.marketId)}
                  onChange={(v) => props.onMarketChange(Number(v))}
                  options={MARKETS.map((m) => ({
                    value: String(m.id),
                    label: m.name,
                    icon: <MarketIcon symbol={m.name} size={16} />,
                  }))}
                />
                  <SelectMenu
                    label="Timeframe"
                    value={props.timeframe}
                    onChange={(v) => props.onTimeframeChange(v as Timeframe)}
                    options={TIMEFRAMES.map((t) => ({ value: t, label: t.toUpperCase() }))}
                  />
                </div>
              </Accordion>

              <Accordion title="Period" summary={periodSummary}>
                <PeriodSelector
                  period={props.period}
                  timeframe={props.timeframe}
                  onChange={props.onPeriodChange}
                />
              </Accordion>

              <Accordion title="Risk" summary={riskSummary}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <NumInput label="Capital ($)" value={props.capital} onChange={props.onCapitalChange} step={1000} />
                    <NumInput label="Leverage" value={props.leverage} onChange={props.onLeverageChange} min={1} max={50} />
                    <NumInput label="Stop Loss %" value={props.stopLoss} onChange={props.onStopLossChange} step={0.5} />
                    <NumInput label="Take Profit %" value={props.takeProfit} onChange={props.onTakeProfitChange} step={0.5} />
                    <NumInput label="Fee (bps)" value={props.feeBps} onChange={props.onFeeBpsChange} step={0.1} />
                    <NumInput label="Funding (bps)" value={props.fundingRateBps} onChange={props.onFundingRateBpsChange} step={0.01} />
                  </div>
                  <Toggle
                    checked={props.enableFunding}
                    onChange={props.onEnableFundingChange}
                    label="Simulate funding"
                  />
                </div>
              </Accordion>
            </AccordionGroup>

            {props.error && (
              <div className="px-3 pt-3">
                <Alert variant="error">{props.error}</Alert>
              </div>
            )}
          </>
        ) : (
          <div className="p-3">
            <OnchainTab
              walletAddress={props.walletAddress as `0x${string}` | null}
              commitStatus={props.commitStatus}
              commitError={props.commitError}
              commitTxHash={props.commitTxHash}
              onRetryCommit={props.onRetryCommit}
              refreshKey={props.commitsRefreshKey}
            />
          </div>
        )}
      </div>

      <div className="shrink-0 p-3 border-t border-white/[0.03] space-y-2.5">
        {!props.walletAddress ? (
          <>
            <Button onClick={props.onConnectWallet} disabled={props.walletConnecting}>
              {props.walletConnecting ? "Connecting…" : "Connect Wallet"}
            </Button>
            <p className="text-[10px] text-center text-[var(--bt-muted)] leading-relaxed">
              Connect on Monad to run backtests & commit results onchain
            </p>
            {props.walletError && <Alert variant="error">{props.walletError}</Alert>}
          </>
        ) : (
          <>
            <WalletPill address={props.walletAddress} />
            {tab === "setup" && (
              <>
                <Button onClick={props.onRun} disabled={props.loading}>
                  {props.loading ? "Running…" : "Run Backtest"}
                </Button>
                {props.hasResult && (
                  <Button
                    variant="secondary"
                    onClick={props.onToggleReplay}
                    className={props.showReplay ? "!brightness-110" : ""}
                  >
                    {props.showReplay ? "Exit Replay" : "▶ Replay"}
                  </Button>
                )}
              </>
            )}
            {tab === "onchain" && props.commitStatus === "error" && (
              <Button onClick={props.onRetryCommit}>Retry last commit</Button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function StrategyParamsForm({
  strategy,
  params,
  onChange,
}: {
  strategy: StrategyType;
  params: StrategyParams;
  onChange: (p: StrategyParams) => void;
}) {
  const g = "grid grid-cols-2 gap-2 mt-2";
  if (strategy === "ma_crossover" || strategy === "ema_crossover") {
    return (
      <div className={g}>
        <NumInput label="Fast" value={params.fastPeriod} onChange={(v) => onChange({ ...params, fastPeriod: v })} />
        <NumInput label="Slow" value={params.slowPeriod} onChange={(v) => onChange({ ...params, slowPeriod: v })} />
      </div>
    );
  }
  if (strategy === "rsi") {
    return (
      <div className={g}>
        <NumInput label="Period" value={params.rsiPeriod} onChange={(v) => onChange({ ...params, rsiPeriod: v })} />
        <NumInput label="OS" value={params.rsiOversold} onChange={(v) => onChange({ ...params, rsiOversold: v })} />
        <NumInput label="OB" value={params.rsiOverbought} onChange={(v) => onChange({ ...params, rsiOverbought: v })} />
      </div>
    );
  }
  if (strategy === "macd") {
    return (
      <div className="grid grid-cols-3 gap-2 mt-2">
        <NumInput label="Fast" value={params.macdFast} onChange={(v) => onChange({ ...params, macdFast: v })} />
        <NumInput label="Slow" value={params.macdSlow} onChange={(v) => onChange({ ...params, macdSlow: v })} />
        <NumInput label="Sig" value={params.macdSignal} onChange={(v) => onChange({ ...params, macdSignal: v })} />
      </div>
    );
  }
  if (strategy === "bollinger") {
    return (
      <div className={g}>
        <NumInput label="Period" value={params.bollingerPeriod} onChange={(v) => onChange({ ...params, bollingerPeriod: v })} />
        <NumInput label="Std" value={params.bollingerStdDev} onChange={(v) => onChange({ ...params, bollingerStdDev: v })} step={0.1} />
      </div>
    );
  }
  if (strategy === "breakout") {
    return (
      <div className="mt-2">
        <NumInput label="Channel" value={params.breakoutPeriod} onChange={(v) => onChange({ ...params, breakoutPeriod: v })} />
      </div>
    );
  }
  if (strategy === "stochastic") {
    return (
      <div className={g}>
        <NumInput label="%K" value={params.stochKPeriod} onChange={(v) => onChange({ ...params, stochKPeriod: v })} />
        <NumInput label="%D" value={params.stochDPeriod} onChange={(v) => onChange({ ...params, stochDPeriod: v })} />
      </div>
    );
  }
  return null;
}
