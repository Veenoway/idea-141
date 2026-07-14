"use client";

import { Panel } from "@/components/ui";

type Phase = "fetching" | "computing" | "committing" | "idle";

interface Props {
  active: boolean;
  phase: Phase;
  elapsedMs: number;
  message?: string;
}

const PHASE_LABELS: Record<Phase, string> = {
  fetching: "Fetching market data…",
  computing: "Running backtest simulation…",
  committing: "Committing result on Monad…",
  idle: "",
};

const PHASE_HINTS: Record<Phase, string> = {
  fetching: "Cached after first load · retry on 429",
  computing: "Calculating indicators & trades",
  committing: "Confirm the transaction in your wallet",
  idle: "",
};

export function LoadingOverlay({ active, phase, elapsedMs, message }: Props) {
  if (!active) return null;

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
      <Panel className="px-8 py-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center gap-5">
          <Spinner />
          <div className="text-center w-full">
            <p className="text-white font-semibold text-lg tracking-tight">
              {message ?? PHASE_LABELS[phase]}
            </p>
            <p className="text-[var(--bt-muted)] text-sm mt-1.5">{PHASE_HINTS[phase]}</p>
          </div>
          <div className="w-full">
            <div className="h-1.5 bg-[var(--paper-4)] rounded-full overflow-hidden shadow-[var(--surface-metal-recessed)]">
              <div className="h-full bg-[var(--paper-7)] rounded-full loading-bar" />
            </div>
            <p className="text-xs text-[var(--bt-muted)] text-center mt-2.5 tabular-nums">{seconds}s</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Spinner() {
  return (
    <div className="relative w-14 h-14">
      <div className="absolute inset-0 rounded-full border-2 border-[var(--paper-border)]" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/70 animate-spin" />
      <div
        className="absolute inset-2 rounded-full border-2 border-transparent border-b-white/30 animate-spin"
        style={{ animationDirection: "reverse", animationDuration: "1.2s" }}
      />
    </div>
  );
}
