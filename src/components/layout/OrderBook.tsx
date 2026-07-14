"use client";

import type { Candle } from "@/types";
import { useMemo } from "react";

interface Props {
  candles: Candle[];
  market: string;
  sliceEnd?: number;
}

export function OrderBook({ candles, market, sliceEnd }: Props) {
  const visible = sliceEnd != null ? candles.slice(0, sliceEnd + 1) : candles;
  const mid = visible[visible.length - 1]?.close ?? 0;

  const { asks, bids } = useMemo(() => {
    if (mid <= 0) return { asks: [], bids: [] };
    const step = mid * 0.0004;
    const asks = Array.from({ length: 12 }, (_, i) => {
      const price = mid + step * (i + 1);
      const size = 0.5 + ((i * 17) % 40) / 10;
      return { price, size, total: size * (i + 1) * 0.3 };
    });
    const bids = Array.from({ length: 12 }, (_, i) => {
      const price = mid - step * (i + 1);
      const size = 0.4 + ((i * 13) % 35) / 10;
      return { price, size, total: size * (i + 1) * 0.28 };
    });
    return { asks: asks.reverse(), bids };
  }, [mid]);

  const maxTotal = Math.max(...asks.map((a) => a.total), ...bids.map((b) => b.total), 1);

  return (
    <aside className="w-[220px] shrink-0 border-l border-[var(--perpl-border)] bg-[var(--perpl-bg)] flex flex-col text-[11px]">
      <div className="flex border-b border-[var(--perpl-border)]">
        <span className="flex-1 py-2 text-center text-white border-b-2 border-[var(--perpl-purple)] font-medium">
          Order Book
        </span>
        <span className="flex-1 py-2 text-center text-[var(--perpl-muted)]">Trades</span>
      </div>
      <div className="grid grid-cols-3 px-2 py-1.5 text-[var(--perpl-muted)] border-b border-[var(--perpl-border)]">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">{market}</span>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto perpl-scroll flex flex-col justify-end">
          {asks.map((row) => (
            <BookRow key={row.price} row={row} side="ask" max={maxTotal} />
          ))}
        </div>
        <div className="py-1.5 px-2 text-center border-y border-[var(--perpl-border)] bg-[var(--perpl-surface)]">
          <span className="text-[var(--perpl-green)] font-semibold tabular-nums text-sm">
            {mid.toFixed(mid > 100 ? 2 : 4)}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto perpl-scroll">
          {bids.map((row) => (
            <BookRow key={row.price} row={row} side="bid" max={maxTotal} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function BookRow({
  row,
  side,
  max,
}: {
  row: { price: number; size: number; total: number };
  side: "ask" | "bid";
  max: number;
}) {
  const pct = (row.total / max) * 100;
  const bg = side === "ask" ? "rgba(255,77,79,0.12)" : "rgba(0,192,118,0.12)";
  return (
    <div className="relative grid grid-cols-3 px-2 py-0.5 tabular-nums hover:bg-white/[0.03]">
      <div
        className="absolute inset-y-0 right-0"
        style={{ width: `${pct}%`, background: bg }}
      />
      <span className={side === "ask" ? "text-[var(--perpl-red)] relative" : "text-[var(--perpl-green)] relative"}>
        {row.price.toFixed(row.price > 100 ? 2 : 4)}
      </span>
      <span className="text-right text-white relative">{row.size.toFixed(3)}</span>
      <span className="text-right text-[var(--perpl-muted)] relative">{row.total.toFixed(2)}</span>
    </div>
  );
}
