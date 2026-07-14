"use client";

import type { BacktestResult, Candle, ReplayEvent } from "@/types";
import { IconButton, SelectMenu } from "@/components/ui";
import { useEffect, useRef, useState, type CSSProperties } from "react";

interface Props {
  candles: Candle[];
  result: BacktestResult;
  index: number;
  onIndexChange: (i: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
}

const SPEEDS = [0.5, 1, 2, 3, 4, 8];
const DEFAULT_SPEED_IDX = String(SPEEDS.indexOf(3));

export function ReplayBar({
  candles,
  result,
  index,
  onIndexChange,
  playing,
  onPlayingChange,
}: Props) {
  const [speedIdx, setSpeedIdx] = useState(DEFAULT_SPEED_IDX);
  const indexRef = useRef(index);
  indexRef.current = index;

  const speed = SPEEDS[Number(speedIdx)] ?? 1;
  const max = Math.max(0, candles.length - 1);
  const currentCandle = candles[index];
  const currentEquity = result.equity[index]?.equity;
  const visibleEvents = result.events.filter((e) => e.time <= (currentCandle?.time ?? 0));

  useEffect(() => {
    if (!playing) return;
    const delay = Math.max(50, 350 / speed);
    const id = setInterval(() => {
      const next = indexRef.current + 1;
      if (next > max) {
        onPlayingChange(false);
        return;
      }
      onIndexChange(next);
    }, delay);
    return () => clearInterval(id);
  }, [playing, speed, max, onIndexChange, onPlayingChange]);

  const setIdx = (i: number) => onIndexChange(Math.max(0, Math.min(max, i)));
  const replayPct = max > 0 ? (index / max) * 100 : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="text-[var(--bt-muted)]">
            Bar <span className="text-white tabular-nums font-medium">{index + 1}</span>
            <span className="text-[var(--bt-muted)]"> / {candles.length}</span>
          </span>
          {currentEquity != null && (
            <span className="text-[var(--bt-muted)]">
              Equity{" "}
              <span className="text-white tabular-nums font-medium">${currentEquity.toFixed(2)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton title="Start" onClick={() => setIdx(0)}>⏮</IconButton>
          <IconButton title="Previous" disabled={index <= 0} onClick={() => setIdx(index - 1)}>◀</IconButton>
          <button
            type="button"
            onClick={() => onPlayingChange(!playing)}
            className="bt-btn bt-btn-secondary h-8 px-3 !w-auto min-w-[72px] !py-0 text-xs"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <IconButton title="Next" disabled={index >= max} onClick={() => setIdx(index + 1)}>▶</IconButton>
          <IconButton title="End" onClick={() => setIdx(max)}>⏭</IconButton>
          <div className="w-[72px]">
            <SelectMenu
              label=""
              hideLabel
              compact
              value={speedIdx}
              onChange={setSpeedIdx}
              options={SPEEDS.map((s, i) => ({ value: String(i), label: `${s}x` }))}
            />
          </div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={max}
        value={index}
        onChange={(e) => {
          onPlayingChange(false);
          setIdx(Number(e.target.value));
        }}
        className="replay-slider w-full"
        style={{ "--replay-pct": `${replayPct}%` } as CSSProperties}
      />

      {visibleEvents.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto perpl-scroll pb-0.5">
          {[...visibleEvents].reverse().slice(0, 6).map((e, i) => (
            <EventChip key={`${e.time}-${e.type}-${i}`} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventChip({ event }: { event: ReplayEvent }) {
  const labelColors: Record<string, string> = {
    long: "text-[var(--bt-green)]",
    short: "text-[var(--bt-red)]",
    close: "text-[var(--bt-label)]",
    stop_loss: "text-[var(--bt-orange)]",
    take_profit: "text-[var(--bt-label)]",
    funding: "text-[var(--bt-muted)]",
  };

  return (
    <span className="bt-chip inline-flex items-center px-2 py-0.5 rounded-[var(--bt-radius-sm)] text-[10px] tabular-nums whitespace-nowrap text-[var(--bt-muted)]">
      {new Date(event.time).toLocaleTimeString()} ·{" "}
      <span className={labelColors[event.type] ?? "text-[var(--bt-label)]"}>{event.label}</span>
    </span>
  );
}
