"use client";

import { MARKETS, STRATEGY_META } from "@/lib/constants";
import { PeriodSelector } from "@/components/PeriodSelector";
import type { PeriodConfig } from "@/lib/period";
import type { StrategyParams, StrategyType } from "@/types";
import type { Timeframe } from "@/types";
import { useState } from "react";

type PanelTab = "strategy" | "risk" | "period";

interface Props {
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
  period: PeriodConfig;
  onPeriodChange: (p: PeriodConfig) => void;
  timeframe: Timeframe;
  loading: boolean;
  onRun: () => void;
  onReplay?: () => void;
  hasResult: boolean;
  showReplay: boolean;
  error: string | null;
  marketId: number;
}

export function StrategyPanel(props: Props) {
  const [tab, setTab] = useState<PanelTab>("strategy");
  const market = MARKETS.find((m) => m.id === props.marketId)?.name ?? "BTC";

  return (
    <aside className="w-[300px] shrink-0 border-l border-[var(--perpl-border)] bg-[var(--perpl-surface)] flex flex-col h-full">
      <div className="flex border-b border-[var(--perpl-border)] text-xs">
        {(
          [
            ["strategy", "Strategy"],
            ["risk", "Risk"],
            ["period", "Period"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 font-medium transition ${
              tab === id
                ? "text-white border-b-2 border-[var(--perpl-purple)]"
                : "text-[var(--perpl-muted)] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-3 pt-3 pb-2 border-b border-[var(--perpl-border)]">
        <div className="flex gap-1 mb-3">
          {["Market", "Limit", "Stop"].map((t, i) => (
            <span
              key={t}
              className={`flex-1 text-center py-1.5 text-xs rounded ${
                i === 0
                  ? "bg-white/10 text-white font-medium"
                  : "text-[var(--perpl-muted)]"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <span className="py-2.5 text-center text-sm font-semibold rounded-md bg-[var(--perpl-green)] text-black">
            Long
          </span>
          <span className="py-2.5 text-center text-sm font-medium rounded-md bg-[var(--perpl-bg)] text-[var(--perpl-muted)] border border-[var(--perpl-border)]">
            Short
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto perpl-scroll p-3 space-y-3">
        {tab === "strategy" && (
          <>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--perpl-muted)]">
                Strategy
              </span>
              <select
                value={props.strategy}
                onChange={(e) => props.onStrategyChange(e.target.value as StrategyType)}
                className="mt-1 w-full bg-[var(--perpl-bg)] border border-[var(--perpl-border)] rounded-md px-2.5 py-2 text-sm text-white"
              >
                {STRATEGY_META.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-[var(--perpl-muted)] leading-relaxed">
              {STRATEGY_META.find((s) => s.id === props.strategy)?.desc}
            </p>
            <StrategyParamsForm
              strategy={props.strategy}
              params={props.params}
              onChange={props.onParamsChange}
            />
          </>
        )}

        {tab === "risk" && (
          <>
            <Field label="Capital ($)" type="number" value={props.capital} onChange={props.onCapitalChange} step={1000} />
            <Field label="Leverage" type="number" value={props.leverage} onChange={props.onLeverageChange} min={1} max={50} />
            <div className="px-1">
              <input
                type="range"
                min={1}
                max={50}
                value={props.leverage}
                onChange={(e) => props.onLeverageChange(Number(e.target.value))}
                className="w-full accent-[var(--perpl-purple)]"
              />
            </div>
            <Field label="Stop Loss (%)" type="number" value={props.stopLoss} onChange={props.onStopLossChange} step={0.5} />
            <Field label="Take Profit (%)" type="number" value={props.takeProfit} onChange={props.onTakeProfitChange} step={0.5} />
            <Field label="Taker Fee (bps)" type="number" value={props.feeBps} onChange={props.onFeeBpsChange} step={0.1} />
            <label className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={props.enableFunding}
                onChange={(e) => props.onEnableFundingChange(e.target.checked)}
                className="accent-[var(--perpl-purple)]"
              />
              <span className="text-sm">Funding rate</span>
            </label>
            {props.enableFunding && (
              <Field
                label="Funding (bps/int.)"
                type="number"
                value={props.fundingRateBps}
                onChange={props.onFundingRateBpsChange}
                step={0.01}
              />
            )}
          </>
        )}

        {tab === "period" && (
          <PeriodSelector
            period={props.period}
            timeframe={props.timeframe}
            onChange={props.onPeriodChange}
          />
        )}

        {props.error && (
          <p className="text-xs text-[var(--perpl-red)] bg-[var(--perpl-red-dim)] rounded-md px-2.5 py-2">
            {props.error}
          </p>
        )}
      </div>

      <div className="p-3 border-t border-[var(--perpl-border)] space-y-2 bg-[var(--perpl-bg)]">
        <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--perpl-muted)] mb-1">
          <div>
            <span>Margin Required</span>
            <p className="text-white text-xs tabular-nums">${props.capital.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span>Fees (est.)</span>
            <p className="text-white text-xs tabular-nums">{props.feeBps} bps</p>
          </div>
        </div>
        <button
          type="button"
          onClick={props.onRun}
          disabled={props.loading}
          className="w-full py-3 rounded-md font-semibold text-sm bg-[var(--perpl-green)] text-black hover:opacity-90 disabled:opacity-40 transition"
        >
          {props.loading ? "Running…" : `Run ${market} Backtest`}
        </button>
        {props.hasResult && props.onReplay && (
          <button
            type="button"
            onClick={props.onReplay}
            className={`w-full py-2 rounded-md text-sm font-medium border transition ${
              props.showReplay
                ? "border-[var(--perpl-purple)] text-[var(--perpl-purple)] bg-[var(--perpl-purple-dim)]"
                : "border-[var(--perpl-border)] text-[var(--perpl-muted)] hover:text-white"
            }`}
          >
            {props.showReplay ? "Exit Replay" : "▶ Replay"}
          </button>
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
  const grid2 = "grid grid-cols-2 gap-2";
  if (strategy === "ma_crossover" || strategy === "ema_crossover") {
    return (
      <div className={grid2}>
        <Field label="Fast" value={params.fastPeriod} onChange={(v) => onChange({ ...params, fastPeriod: v })} />
        <Field label="Slow" value={params.slowPeriod} onChange={(v) => onChange({ ...params, slowPeriod: v })} />
      </div>
    );
  }
  if (strategy === "rsi") {
    return (
      <div className={grid2}>
        <Field label="Period" value={params.rsiPeriod} onChange={(v) => onChange({ ...params, rsiPeriod: v })} />
        <Field label="Oversold" value={params.rsiOversold} onChange={(v) => onChange({ ...params, rsiOversold: v })} />
        <Field label="Overbought" value={params.rsiOverbought} onChange={(v) => onChange({ ...params, rsiOverbought: v })} />
      </div>
    );
  }
  if (strategy === "macd") {
    return (
      <div className="grid grid-cols-3 gap-2">
        <Field label="Fast" value={params.macdFast} onChange={(v) => onChange({ ...params, macdFast: v })} />
        <Field label="Slow" value={params.macdSlow} onChange={(v) => onChange({ ...params, macdSlow: v })} />
        <Field label="Sig" value={params.macdSignal} onChange={(v) => onChange({ ...params, macdSignal: v })} />
      </div>
    );
  }
  if (strategy === "bollinger") {
    return (
      <div className={grid2}>
        <Field label="Period" value={params.bollingerPeriod} onChange={(v) => onChange({ ...params, bollingerPeriod: v })} />
        <Field label="Std" value={params.bollingerStdDev} onChange={(v) => onChange({ ...params, bollingerStdDev: v })} step={0.1} />
      </div>
    );
  }
  if (strategy === "breakout") {
    return <Field label="Channel" value={params.breakoutPeriod} onChange={(v) => onChange({ ...params, breakoutPeriod: v })} />;
  }
  if (strategy === "stochastic") {
    return (
      <div className={grid2}>
        <Field label="%K" value={params.stochKPeriod} onChange={(v) => onChange({ ...params, stochKPeriod: v })} />
        <Field label="%D" value={params.stochDPeriod} onChange={(v) => onChange({ ...params, stochDPeriod: v })} />
        <Field label="OS" value={params.stochOversold} onChange={(v) => onChange({ ...params, stochOversold: v })} />
        <Field label="OB" value={params.stochOverbought} onChange={(v) => onChange({ ...params, stochOverbought: v })} />
      </div>
    );
  }
  return null;
}

function Field({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  type = "number",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-[var(--perpl-muted)]">{label}</span>
      <input
        type={type}
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full bg-[var(--perpl-bg)] border border-[var(--perpl-border)] rounded-md px-2.5 py-1.5 text-sm tabular-nums"
      />
    </label>
  );
}
