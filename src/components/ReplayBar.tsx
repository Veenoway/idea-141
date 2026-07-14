"use client";

import type { BacktestResult, Candle, ReplayEvent } from "@/types";
import { Badge, IconButton, SelectMenu } from "@/components/ui";
import { useEffect, useRef, useState } from "react";

interface Props {
  candles: Candle[];
  result: BacktestResult;
  index: number;
  onIndexChange: (i: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
}

const SPEEDS = [0.5, 1, 2, 4, 8];

export function ReplayBar({
  candles,
  result,
  index,
  onIndexChange,
  playing,
  onPlayingChange,
}: Props) {
  const [speedIdx, setSpeedIdx] = useState("1");
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

  return (
    <div className="shrink-0 bg-[var(--bt-card)] border-b border-[var(--bt-border)] px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <Badge tone="accent">Replay</Badge>
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
            className="h-8 px-4 rounded-[var(--bt-radius-sm)] text-xs font-semibold bg-[var(--bt-accent)] text-white min-w-[76px] hover:brightness-110 transition-all shadow-[0_4px_16px_rgba(131,110,249,0.2)]"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <IconButton title="Next" disabled={index >= max} onClick={() => setIdx(index + 1)}>▶</IconButton>
          <IconButton title="End" onClick={() => setIdx(max)}>⏭</IconButton>
          <div className="min-w-[76px]">
            <SelectMenu
              label=""
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
        className="w-full accent-[var(--bt-accent)] h-1.5 cursor-pointer rounded-full"
      />

      {visibleEvents.length > 0 && (
        <div className="flex gap-2 overflow-x-auto perpl-scroll pb-0.5">
          {[...visibleEvents].reverse().slice(0, 6).map((e, i) => (
            <EventChip key={`${e.time}-${e.type}-${i}`} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventChip({ event }: { event: ReplayEvent }) {
  const tones: Record<string, "green" | "red" | "muted" | "accent" | "orange"> = {
    long: "green",
    short: "red",
    close: "muted",
    stop_loss: "orange",
    take_profit: "accent",
    funding: "accent",
  };
  return (
    <Badge tone={tones[event.type] ?? "muted"}>
      {new Date(event.time).toLocaleTimeString()} · {event.label}
    </Badge>
  );
}
