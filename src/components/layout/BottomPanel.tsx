"use client";

import type { BacktestResult } from "@/types";
import { useState } from "react";

type Tab = "positions" | "trades" | "orders" | "pnl";

interface Props {
  result: BacktestResult | null;
  fmt: (n: number, d?: number) => string;
}

export function BottomPanel({ result, fmt }: Props) {
  const [tab, setTab] = useState<Tab>("trades");

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "positions", label: "Positions" },
    { id: "trades", label: "Trade History", count: result?.trades.length },
    { id: "orders", label: "Order History" },
    { id: "pnl", label: "P&L History" },
  ];

  return (
    <div className="h-[280px] shrink-0 border-t border-[var(--perpl-border)] bg-[var(--perpl-surface)] flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--perpl-border)]">
        <div className="flex items-center overflow-x-auto perpl-scroll">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                tab === t.id
                  ? "border-[var(--perpl-purple)] text-white"
                  : "border-transparent text-[var(--perpl-muted)] hover:text-white"
              }`}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="ml-1 text-[var(--perpl-muted)]">({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto perpl-scroll">
        {!result && (
          <p className="p-4 text-sm text-[var(--perpl-muted)]">Run a backtest to see results</p>
        )}

        {tab === "trades" && result && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--perpl-surface-2)] z-10">
              <tr className="text-[var(--perpl-muted)]">
                <th className="text-left py-2 px-3 font-medium">#</th>
                <th className="text-left py-2 px-3 font-medium">Coin</th>
                <th className="text-left py-2 px-3 font-medium">Side</th>
                <th className="text-right py-2 px-3 font-medium">Entry</th>
                <th className="text-right py-2 px-3 font-medium">Exit</th>
                <th className="text-right py-2 px-3 font-medium">Unrealized PnL</th>
                <th className="text-right py-2 px-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.trades.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-[var(--perpl-border)] hover:bg-white/[0.03]"
                >
                  <td className="py-2 px-3 text-[var(--perpl-muted)]">{t.id}</td>
                  <td className="py-2 px-3 font-medium text-white">—</td>
                  <td
                    className={`py-2 px-3 font-medium ${
                      t.side === "long" ? "text-[var(--perpl-green)]" : "text-[var(--perpl-red)]"
                    }`}
                  >
                    {t.side.toUpperCase()}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">${fmt(t.entryPrice)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">${fmt(t.exitPrice)}</td>
                  <td
                    className={`py-2 px-3 text-right tabular-nums font-medium ${
                      t.pnl >= 0 ? "text-[var(--perpl-green)]" : "text-[var(--perpl-red)]"
                    }`}
                  >
                    {t.pnl >= 0 ? "+" : ""}${fmt(t.pnl)}
                  </td>
                  <td className="py-2 px-3 text-right text-[var(--perpl-muted)]">{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "positions" && result && (
          <p className="p-4 text-sm text-[var(--perpl-muted)]">
            Positions are closed at end of backtest — see Trade History.
          </p>
        )}

        {tab === "orders" && result && (
          <p className="p-4 text-sm text-[var(--perpl-muted)]">
            {result.trades.length} filled orders in this simulation.
          </p>
        )}

        {tab === "pnl" && result && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <PnlCell label="Total PnL" value={`${result.metrics.totalPnl >= 0 ? "+" : ""}$${fmt(result.metrics.totalPnl)}`} positive={result.metrics.totalPnl >= 0} />
            <PnlCell label="Return" value={`${result.metrics.totalPnlPercent >= 0 ? "+" : ""}${fmt(result.metrics.totalPnlPercent)}%`} positive={result.metrics.totalPnlPercent >= 0} />
            <PnlCell label="Max Drawdown" value={`-${fmt(result.metrics.maxDrawdownPercent, 1)}%`} positive={false} />
            <PnlCell label="Funding PnL" value={`${result.metrics.totalFunding >= 0 ? "+" : ""}$${fmt(result.metrics.totalFunding)}`} positive={result.metrics.totalFunding >= 0} />
          </div>
        )}
      </div>
    </div>
  );
}

function PnlCell({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-[var(--perpl-bg)] rounded-md border border-[var(--perpl-border)] px-3 py-2">
      <p className="text-[10px] text-[var(--perpl-muted)] uppercase">{label}</p>
      <p
        className={`text-sm font-semibold tabular-nums mt-1 ${
          positive === undefined
            ? "text-white"
            : positive
              ? "text-[var(--perpl-green)]"
              : "text-[var(--perpl-red)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
