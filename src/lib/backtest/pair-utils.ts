import type { Candle } from "@/types";

export interface AlignedPairSeries {
  base: Candle[];
  quote: Candle[];
  ratio: Candle[];
}

export function alignPairCandles(base: Candle[], quote: Candle[]): AlignedPairSeries {
  const quoteByTime = new Map(quote.map((c) => [c.time, c]));
  const alignedBase: Candle[] = [];
  const alignedQuote: Candle[] = [];
  const ratio: Candle[] = [];

  for (const b of base) {
    const q = quoteByTime.get(b.time);
    if (!q || b.close <= 0 || q.close <= 0 || b.open <= 0 || q.open <= 0) continue;

    alignedBase.push(b);
    alignedQuote.push(q);
    ratio.push({
      time: b.time,
      open: b.open / q.open,
      high: Math.max(b.open / q.open, b.close / q.close, b.high / q.low, b.low / q.high),
      low: Math.min(b.open / q.open, b.close / q.close, b.low / q.high, b.high / q.low),
      close: b.close / q.close,
      volume: (b.volume + q.volume) / 2,
    });
  }

  return { base: alignedBase, quote: alignedQuote, ratio };
}

export function rollingStd(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 1) return out;

  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
      sumSq += values[j] * values[j];
    }
    const mean = sum / period;
    const variance = sumSq / period - mean * mean;
    out[i] = variance > 0 ? Math.sqrt(variance) : 0;
  }
  return out;
}
