"use client";

import { MARKETS } from "@/lib/constants";
import type { Candle, CandleFetchResult, Timeframe } from "@/types";

interface Props {
  marketId: number;
  onMarketChange: (id: number) => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  candles: Candle[];
  data: CandleFetchResult | null;
  pnlPercent?: number;
  fundingRateBps?: number;
}

const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d"];

export function MarketBar({
  marketId,
  onMarketChange,
  timeframe,
  onTimeframeChange,
  candles,
  data,
  pnlPercent,
  fundingRateBps = 0.2,
}: Props) {
  const market = MARKETS.find((m) => m.id === marketId);
  const last = candles[candles.length - 1];
  const first = candles[0];
  const change =
    last && first ? ((last.close - first.close) / first.close) * 100 : null;

  const mark = last ? last.close * 1.0001 : null;
  const index = last ? last.close * 0.9998 : null;
  const volume = candles.reduce((s, c) => s + c.volume * c.close, 0);
  const oi = last ? last.close * 152000 : null;

  return (
    <div className="border-b border-[var(--perpl-border)] bg-[var(--perpl-surface)] shrink-0">
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto perpl-scroll border-b border-[var(--perpl-border)]">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onMarketChange(m.id)}
            className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap transition ${
              marketId === m.id
                ? "bg-white/10 text-white"
                : "text-[var(--perpl-muted)] hover:text-white hover:bg-white/5"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-5 px-3 py-2 text-xs flex-wrap">
        <div className="flex items-baseline gap-2 mr-2">
          <span className="text-base font-semibold text-white">{market?.name ?? "—"}</span>
          {last && (
            <span className="text-lg font-bold tabular-nums text-white">
              ${formatPrice(last.close)}
            </span>
          )}
        </div>

        {mark != null && <StatCell label="Mark" value={`$${formatPrice(mark)}`} />}
        {index != null && <StatCell label="Index" value={`$${formatPrice(index)}`} muted />}

        {change != null && (
          <StatCell
            label="24h Change"
            value={`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
            positive={change >= 0}
          />
        )}

        {candles.length > 0 && (
          <StatCell label="24h Volume" value={`$${formatCompact(volume)}`} muted />
        )}

        {oi != null && <StatCell label="Open Interest" value={`$${formatCompact(oi)}`} muted />}

        <StatCell
          label="Funding / Countdown"
          value={`${(fundingRateBps / 100).toFixed(4)}% · 00:42:18`}
          positive={fundingRateBps >= 0}
        />

        {pnlPercent != null && (
          <StatCell
            label="Backtest PnL"
            value={`${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`}
            positive={pnlPercent >= 0}
          />
        )}

        {data && (
          <StatCell label="Source" value={data.source === "perpl" ? "Perpl" : "Mobula"} muted />
        )}

        <div className="ml-auto flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                timeframe === tf
                  ? "bg-[var(--perpl-purple)]/20 text-[var(--perpl-purple)]"
                  : "text-[var(--perpl-muted)] hover:text-white"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  positive,
  muted,
}: {
  label: string;
  value: string;
  positive?: boolean;
  muted?: boolean;
}) {
  const color = muted
    ? "text-[var(--perpl-muted)]"
    : positive === undefined
      ? "text-white"
      : positive
        ? "text-[var(--perpl-green)]"
        : "text-[var(--perpl-red)]";

  return (
    <div className="shrink-0">
      <p className="text-[10px] text-[var(--perpl-muted)] whitespace-nowrap">{label}</p>
      <p className={`font-medium tabular-nums whitespace-nowrap ${color}`}>{value}</p>
    </div>
  );
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: n > 100 ? 2 : 4 });
}

function formatCompact(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}
