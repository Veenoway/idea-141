"use client";

import { MARKETS, STRATEGY_META } from "@/lib/constants";
import { PeriodSelector } from "@/components/PeriodSelector";
import {
  Alert,
  Button,
  NumInput,
  SectionTitle,
  SelectMenu,
  Toggle,
  WalletPill,
} from "@/components/ui";
import type { PeriodConfig } from "@/lib/period";
import type { StrategyParams, StrategyType, Timeframe } from "@/types";

const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d"];

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
}

export function RightDrawer(props: Props) {
  return (
    <aside className="w-[320px] shrink-0 h-screen sticky top-0 flex flex-col bg-[var(--bt-bg)] border-l border-[var(--bt-border)] z-20">
      <div className="shrink-0 px-4 py-4 border-b border-[var(--bt-border)]">
        <h2 className="text-sm font-semibold text-white tracking-tight">Configuration</h2>
        <p className="text-[11px] text-[var(--bt-muted)] mt-1">Strategy · Market · Risk</p>
      </div>

      <div className="flex-1 overflow-y-auto perpl-scroll p-4 space-y-6">
        <section>
          <SectionTitle>Strategy</SectionTitle>
          <div className="space-y-2 max-h-52 overflow-y-auto perpl-scroll pr-0.5">
            {STRATEGY_META.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => props.onStrategyChange(s.id)}
                className={`w-full text-left rounded-[var(--bt-radius-sm)] px-3 py-2.5 border text-xs transition-all duration-150 ${
                  props.strategy === s.id
                    ? "border-[var(--bt-accent)]/60 bg-[var(--bt-accent-dim)] shadow-[0_0_16px_rgba(131,110,249,0.12)]"
                    : "border-[var(--bt-border)] bg-[var(--bt-card)] hover:border-[var(--bt-border-strong)] hover:bg-[var(--bt-card-hover)]"
                }`}
              >
                <p className="font-medium text-sm text-white">{s.label}</p>
                <p className="text-[var(--bt-muted)] mt-1 leading-snug">{s.desc}</p>
              </button>
            ))}
          </div>
          <StrategyParamsForm
            strategy={props.strategy}
            params={props.params}
            onChange={props.onParamsChange}
          />
        </section>

        <section>
          <SectionTitle>Market</SectionTitle>
          <div className="space-y-3">
            <SelectMenu
              label="Asset"
              value={String(props.marketId)}
              onChange={(v) => props.onMarketChange(Number(v))}
              options={MARKETS.map((m) => ({ value: String(m.id), label: m.name }))}
            />
            <SelectMenu
              label="Timeframe"
              value={props.timeframe}
              onChange={(v) => props.onTimeframeChange(v as Timeframe)}
              options={TIMEFRAMES.map((t) => ({ value: t, label: t.toUpperCase() }))}
            />
          </div>
        </section>

        <section>
          <SectionTitle>Period</SectionTitle>
          <PeriodSelector
            period={props.period}
            timeframe={props.timeframe}
            onChange={props.onPeriodChange}
          />
        </section>

        <section>
          <SectionTitle>Risk</SectionTitle>
          <div className="bt-panel p-3 space-y-3">
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
        </section>

        {props.error && <Alert variant="error">{props.error}</Alert>}
      </div>

      <div className="shrink-0 p-4 border-t border-[var(--bt-border)] space-y-2.5 bg-[var(--bt-bg)]">
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
            <Button onClick={props.onRun} disabled={props.loading}>
              {props.loading ? "Running…" : "Run Backtest"}
            </Button>
            {props.hasResult && (
              <Button
                variant="secondary"
                onClick={props.onToggleReplay}
                className={
                  props.showReplay
                    ? "!border-[var(--bt-accent)]/50 !text-[var(--bt-accent)] !bg-[var(--bt-accent-dim)]"
                    : ""
                }
              >
                {props.showReplay ? "Exit Replay" : "▶ Replay"}
              </Button>
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
  const g = "grid grid-cols-2 gap-3 mt-3";
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
      <div className="grid grid-cols-3 gap-3 mt-3">
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
      <div className="mt-3">
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
