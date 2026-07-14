"use client";

import {
  DAY_PRESETS,
  estimateApiChunks,
  estimateCandles,
  type PeriodConfig,
} from "@/lib/period";
import { Chip, SegmentedControl, TextInput } from "@/components/ui";
import type { Timeframe } from "@/types";

interface Props {
  period: PeriodConfig;
  timeframe: Timeframe;
  onChange: (period: PeriodConfig) => void;
}

export function PeriodSelector({ period, timeframe, onChange }: Props) {
  const resolvedDays =
    period.mode === "days"
      ? period.days
      : Math.max(
          1,
          Math.ceil(
            (new Date(`${period.toDate}T23:59:59`).getTime() -
              new Date(`${period.fromDate}T00:00:00`).getTime()) /
              86_400_000
          )
        );

  const estCandles = estimateCandles(timeframe, resolvedDays);
  const estChunks = estimateApiChunks(estCandles);

  return (
    <div className="space-y-3">
      <SegmentedControl
        value={period.mode}
        onChange={(mode) => onChange({ ...period, mode })}
        options={[
          { value: "days" as const, label: "N days" },
          { value: "range" as const, label: "Date range" },
        ]}
      />

      {period.mode === "days" ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {DAY_PRESETS.map((d) => (
              <Chip
                key={d}
                active={period.days === d}
                onClick={() => onChange({ ...period, days: d })}
              >
                {d}d
              </Chip>
            ))}
          </div>
          <TextInput
            label="Custom (1–365)"
            type="number"
            min={1}
            max={365}
            value={period.days}
            onChange={(v) =>
              onChange({ ...period, days: Math.min(365, Math.max(1, Number(v) || 1)) })
            }
          />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="From"
            type="date"
            value={period.fromDate}
            onChange={(v) => onChange({ ...period, fromDate: v })}
          />
          <TextInput
            label="To"
            type="date"
            value={period.toDate}
            onChange={(v) => onChange({ ...period, toDate: v })}
          />
        </div>
      )}

      <p className="text-[10px] text-[var(--bt-muted)] leading-relaxed">
        ~{estCandles.toLocaleString()} candles · {estChunks} API call{estChunks > 1 ? "s" : ""}
        {estChunks > 5 && <span className="text-[var(--bt-orange)]"> · slow first load</span>}
      </p>
    </div>
  );
}
