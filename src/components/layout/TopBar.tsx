"use client";

import { MarketIcon } from "@/components/MarketIcon";
import { MARKETS, perplTradeUrl } from "@/lib/constants";
import type { PeriodConfig } from "@/lib/period";
import { resolvePeriodMs } from "@/lib/period";
import type { CandleFetchResult, Timeframe } from "@/types";
import type { ReactNode } from "react";

interface Props {
  marketId: number;
  timeframe: Timeframe;
  period: PeriodConfig;
  data: CandleFetchResult | null;
  candleCount: number;
}

export function TopBar({ marketId, timeframe, period, data, candleCount }: Props) {
  const market = MARKETS.find((m) => m.id === marketId)?.name ?? "—";
  const { days } = resolvePeriodMs(period);
  const periodLabel =
    period.mode === "days"
      ? `${days} days`
      : `${period.fromDate} → ${period.toDate}`;

  return (
    <header className="shrink-0 px-3 py-3 border-b border-white/[0.03] bg-[var(--paper-2)]">
      <div className="flex items-center gap-4 flex-wrap">
        <img src="https://pbs.twimg.com/profile_images/2061689765854867456/hXUMeXnP_400x400.jpg" alt="Perp Backtest Bench" className="w-8 h-8 rounded-full" />
        <h1 className="text-lg font-bold text-white tracking-tight whitespace-nowrap shrink-0">
          IDEA #141
        </h1>

        <div className="hidden sm:block w-px h-10 bg-white/[0.06] shrink-0 ml-5" aria-hidden />

        <MetaItem
          label="Market"
          value={market}
          icon={<MarketIcon symbol={market} size={16} />}
        />
        <MetaDivider />
        <MetaItem label="Timeframe" value={timeframe.toUpperCase()} />
        <MetaDivider />
        <MetaItem label="Period" value={periodLabel} />
        {data && (
          <>
            <MetaDivider />
            <MetaItem
              label="Source"
              value={data.source === "perpl" ? "Perpl API" : "Mobula"}
            />
          </>
        )}
        {candleCount > 0 && (
          <>
            <MetaDivider />
            <MetaItem label="Candles" value={candleCount.toLocaleString()} />
          </>
        )}

        <a
          href={perplTradeUrl(market)}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto shrink-0 bt-btn bt-btn-primary !w-auto !py-1.5 !px-3 !text-xs no-underline"
        >
          Trade {market} on Perpl ↗
        </a>
      </div>
    </header>
  );
}

function MetaDivider() {
  return <div className="hidden md:block w-px h-10 bg-white/[0.06] shrink-0" aria-hidden />;
}

function MetaItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex gap-3 min-w-0 shrink-0">
      <span className="text-[14px] text-[var(--bt-muted)] whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        {icon}
        <span className="font-semibold tabular-nums text-white text-sm whitespace-nowrap">{value}</span>
      </div>
    </div>
  );
}
