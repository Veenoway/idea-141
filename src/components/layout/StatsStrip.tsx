"use client";

import type { BacktestMetrics } from "@/types";

interface Props {
  metrics: BacktestMetrics;
  fmt: (n: number, d?: number) => string;
}

export function StatsStrip({ metrics: m, fmt }: Props) {
  const items = [
    { label: "Final Capital", value: `$${fmt(m.finalCapital)}` },
    {
      label: "Total PnL",
      value: `${m.totalPnl >= 0 ? "+" : ""}$${fmt(m.totalPnl)}`,
      positive: m.totalPnl >= 0,
    },
    {
      label: "Return",
      value: `${m.totalPnlPercent >= 0 ? "+" : ""}${fmt(m.totalPnlPercent)}%`,
      positive: m.totalPnlPercent >= 0,
    },
    { label: "Win Rate", value: `${fmt(m.winRate, 1)}%` },
    {
      label: "Profit Factor",
      value: m.profitFactor === Infinity ? "∞" : fmt(m.profitFactor, 2),
    },
    {
      label: "Max Drawdown",
      value: `-${fmt(m.maxDrawdownPercent, 1)}%`,
      positive: false,
    },
    { label: "Trades", value: String(m.totalTrades) },
    {
      label: "Funding PnL",
      value: `${m.totalFunding >= 0 ? "+" : ""}$${fmt(m.totalFunding)}`,
      positive: m.totalFunding >= 0,
    },
  ];

  return (
    <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-4 border-b border-[var(--bt-border)] bg-[var(--bt-bg)]">
      {items.map(({ label, value, positive }) => (
        <div key={label} className="bt-panel px-3 py-2.5 hover:bg-[var(--bt-card-hover)] transition-colors">
          <p className="text-[10px] text-[var(--bt-muted)] truncate uppercase tracking-wide">{label}</p>
          <p
            className={`text-sm font-bold tabular-nums mt-1 truncate ${
              positive === undefined
                ? "text-white"
                : positive
                  ? "text-green-500"
                  : "text-red-500"
            }`}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
