import { TIMEFRAME_SECONDS } from "@/lib/constants";
import type { Timeframe } from "@/types";

export type PeriodMode = "days" | "range";

export interface PeriodConfig {
  mode: PeriodMode;
  days: number;
  fromDate: string;
  toDate: string;
}

export const DAY_PRESETS = [7, 14, 30, 60, 90, 180, 365] as const;

export function defaultPeriodConfig(): PeriodConfig {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    mode: "days",
    days: 30,
    fromDate: toIsoDate(from),
    toDate: toIsoDate(to),
  };
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolvePeriodMs(period: PeriodConfig): { fromMs: number; toMs: number; days: number } {
  if (period.mode === "range") {
    const fromMs = new Date(`${period.fromDate}T00:00:00`).getTime();
    const toMs = new Date(`${period.toDate}T23:59:59`).getTime();
    const days = Math.max(1, Math.ceil((toMs - fromMs) / 86_400_000));
    return { fromMs, toMs, days };
  }

  const days = Math.min(365, Math.max(1, period.days));
  const toMs = Date.now();
  const fromMs = toMs - days * 86_400_000;
  return { fromMs, toMs, days };
}

export function estimateCandles(timeframe: Timeframe, days: number): number {
  const sec = TIMEFRAME_SECONDS[timeframe];
  return Math.ceil((days * 86_400) / sec);
}

export function estimateApiChunks(candleCount: number): number {
  return Math.ceil(candleCount / 1024);
}

export function buildCandlesQuery(
  marketId: number,
  timeframe: Timeframe,
  period: PeriodConfig
): string {
  const params = new URLSearchParams({
    marketId: String(marketId),
    timeframe,
  });

  if (period.mode === "range") {
    params.set("from", period.fromDate);
    params.set("to", period.toDate);
  } else {
    params.set("days", String(period.days));
  }

  return `/api/candles?${params.toString()}`;
}
