"use client";

import type { BacktestResult } from "@/types";
import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  trades: BacktestResult["trades"];
  fmt: (n: number, d?: number) => string;
  replayActive?: boolean;
}

export function TradeLog({ trades, fmt, replayActive }: Props) {
  const prevIdsRef = useRef<Set<number>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<number>>(new Set());

  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => b.exitTime - a.exitTime || b.id - a.id),
    [trades]
  );

  useEffect(() => {
    if (replayActive) {
      prevIdsRef.current = new Set();
      setHighlightedIds(new Set());
    } else {
      prevIdsRef.current = new Set(trades.map((t) => t.id));
      setHighlightedIds(new Set());
    }
  }, [replayActive]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!replayActive) return;

    const newIds = trades.filter((t) => !prevIdsRef.current.has(t.id)).map((t) => t.id);
    for (const t of trades) prevIdsRef.current.add(t.id);
    if (newIds.length === 0) return;

    setHighlightedIds((prev) => {
      const next = new Set(prev);
      newIds.forEach((id) => next.add(id));
      return next;
    });

    const timer = setTimeout(() => {
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 1400);

    return () => clearTimeout(timer);
  }, [trades, replayActive]);

  return (
    <section className="bt-main-panel p-3 shrink-0">
      <h2 className="text-sm font-medium text-[var(--bt-label)] mb-3">Trade Log ({trades.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bt-table-head bt-table-row">
              <th className="text-left uppercase tracking-wide text-[10px]">#</th>
              <th className="text-left uppercase tracking-wide text-[10px]">Side</th>
              <th className="text-right uppercase tracking-wide text-[10px]">Entry</th>
              <th className="text-right uppercase tracking-wide text-[10px]">Exit</th>
              <th className="text-right uppercase tracking-wide text-[10px]">PnL</th>
              <th className="text-right uppercase tracking-wide text-[10px]">Reason</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((t) => (
              <tr
                key={t.id}
                className={`bt-table-row border-t border-white/[0.03] hover:brightness-[1.03] transition-[filter] ${
                  highlightedIds.has(t.id) ? "trade-row-new" : ""
                }`}
              >
                <td className="text-[var(--bt-muted)]">{t.id}</td>
                <td
                  className={`font-medium ${
                    t.side === "long" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {t.side.toUpperCase()}
                </td>
                <td className="text-right tabular-nums">${fmt(t.entryPrice)}</td>
                <td className="text-right tabular-nums">${fmt(t.exitPrice)}</td>
                <td
                  className={`text-right font-medium tabular-nums ${
                    t.pnl >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {t.pnl >= 0 ? "+" : ""}${fmt(t.pnl)}
                </td>
                <td className="text-right text-[var(--bt-muted)]">{t.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
