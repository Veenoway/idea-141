"use client";

import type { BacktestResult } from "@/types";
import { Badge, Panel } from "@/components/ui";
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
    <div className="p-4 bg-[var(--bt-bg)]">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-medium text-[var(--bt-label)]">Trade Log ({trades.length})</h2>
        {replayActive && <Badge tone="accent">live replay</Badge>}
      </div>
      <Panel className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--bt-muted)] border-b border-[var(--bt-border)] bg-[var(--bt-input)]">
              <th className="text-left py-2.5 px-3 font-medium uppercase tracking-wide text-[10px]">#</th>
              <th className="text-left py-2.5 px-3 font-medium uppercase tracking-wide text-[10px]">Side</th>
              <th className="text-right py-2.5 px-3 font-medium uppercase tracking-wide text-[10px]">Entry</th>
              <th className="text-right py-2.5 px-3 font-medium uppercase tracking-wide text-[10px]">Exit</th>
              <th className="text-right py-2.5 px-3 font-medium uppercase tracking-wide text-[10px]">PnL</th>
              <th className="text-right py-2.5 px-3 font-medium uppercase tracking-wide text-[10px]">Reason</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-[var(--bt-border)] hover:bg-[var(--bt-card-hover)] transition-colors ${
                  highlightedIds.has(t.id) ? "trade-row-new" : ""
                }`}
              >
                <td className="py-2 px-3 text-[var(--bt-muted)]">{t.id}</td>
                <td
                  className={`py-2 px-3 font-medium ${
                    t.side === "long" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {t.side.toUpperCase()}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">${fmt(t.entryPrice)}</td>
                <td className="py-2 px-3 text-right tabular-nums">${fmt(t.exitPrice)}</td>
                <td
                  className={`py-2 px-3 text-right font-medium tabular-nums ${
                    t.pnl >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {t.pnl >= 0 ? "+" : ""}${fmt(t.pnl)}
                </td>
                <td className="py-2 px-3 text-right text-[var(--bt-muted)]">{t.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
