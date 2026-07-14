"use client";

import { MARKETS } from "@/lib/constants";
import { Badge } from "@/components/ui";
import type { PeriodConfig } from "@/lib/period";
import { resolvePeriodMs } from "@/lib/period";
import type { CandleFetchResult, Timeframe } from "@/types";

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
    <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-[var(--bt-border)] bg-[var(--bt-bg)] text-sm flex-wrap">
      <BarPill label="Market" value={market} />
      <BarPill label="Timeframe" value={timeframe.toUpperCase()} />
      <BarPill label="Period" value={periodLabel} />
      {data && (
        <BarPill
          label="Source"
          value={data.source === "perpl" ? "Perpl API" : "Mobula"}
          badge={data.source === "perpl" ? "green" : "orange"}
        />
      )}
      {candleCount > 0 && <BarPill label="Candles" value={String(candleCount)} />}
    </div>
  );
}

function BarPill({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: "green" | "orange";
}) {
  return (
    <div className="bt-panel px-3 py-2 min-w-[88px]">
      <p className="text-[10px] uppercase tracking-wider text-[var(--bt-muted)] mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className="font-semibold tabular-nums text-white text-sm">{value}</p>
        {badge && <Badge tone={badge}>{badge === "green" ? "Live" : "Fallback"}</Badge>}
      </div>
    </div>
  );
}
