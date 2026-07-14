"use client";

import type { BacktestResult, Candle, ReplayEvent } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  candles: Candle[];
  result: BacktestResult;
  onIndexChange: (index: number) => void;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

export function ReplayPlayer({ candles, result, onIndexChange }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const speed = SPEEDS[speedIdx];
  const max = candles.length - 1;
  const currentCandle = candles[index];
  const currentEquity = result.equity[index]?.equity;
  const visibleEvents = result.events.filter((e) => e.time <= (currentCandle?.time ?? 0));

  const setIndexSafe = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(max, i));
      setIndex(clamped);
      onIndexChange(clamped);
    },
    [max, onIndexChange]
  );

  useEffect(() => {
    onIndexChange(0);
  }, [candles, result, onIndexChange]);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        if (prev >= max) {
          setPlaying(false);
          return prev;
        }
        const next = prev + 1;
        onIndexChange(next);
        return next;
      });
    }, 400 / speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, max, onIndexChange]);

  const btn = "px-2 py-1 rounded text-xs border border-[var(--perpl-border)] text-[var(--perpl-muted)] hover:text-white disabled:opacity-30";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-[var(--perpl-muted)]">
          Bar <span className="text-white font-medium">{index + 1}</span>/{candles.length}
          {currentEquity != null && (
            <span className="ml-3">
              Equity <span className="text-white tabular-nums">${currentEquity.toFixed(2)}</span>
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => setIndexSafe(0)}>⏮</button>
          <button type="button" className={btn} disabled={index === 0} onClick={() => setIndexSafe(index - 1)}>◀</button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1 rounded text-xs font-semibold bg-[var(--perpl-green)] text-black min-w-[64px]"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" className={btn} disabled={index >= max} onClick={() => setIndexSafe(index + 1)}>▶</button>
          <button type="button" className={btn} onClick={() => setIndexSafe(max)}>⏭</button>
          <select
            value={speedIdx}
            onChange={(e) => setSpeedIdx(Number(e.target.value))}
            className="bg-[var(--perpl-bg)] border border-[var(--perpl-border)] rounded px-1.5 py-1 text-xs"
          >
            {SPEEDS.map((s, i) => (
              <option key={s} value={i}>{s}x</option>
            ))}
          </select>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={max}
        value={index}
        onChange={(e) => setIndexSafe(Number(e.target.value))}
        className="w-full accent-[var(--perpl-green)] h-1"
      />

      {visibleEvents.length > 0 && (
        <div className="flex gap-3 overflow-x-auto perpl-scroll text-[10px]">
          {[...visibleEvents].reverse().slice(0, 5).map((e, i) => (
            <EventChip key={`${e.time}-${i}`} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventChip({ event }: { event: ReplayEvent }) {
  const colors: Record<string, string> = {
    long: "text-[var(--perpl-green)]",
    short: "text-[var(--perpl-red)]",
    close: "text-[var(--perpl-muted)]",
    stop_loss: "text-orange-400",
    take_profit: "text-blue-400",
    funding: "text-purple-400",
  };
  return (
    <span className={`whitespace-nowrap ${colors[event.type] ?? ""}`}>
      {new Date(event.time).toLocaleTimeString()} · {event.label}
    </span>
  );
}
