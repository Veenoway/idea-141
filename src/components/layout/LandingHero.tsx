"use client";

import { STRATEGY_META } from "@/lib/constants";

const STEPS = [
  {
    n: "01",
    title: "Connect wallet",
    desc: "MetaMask, Rabby, WalletConnect & more via Reown — Monad mainnet.",
  },
  {
    n: "02",
    title: "Pick strategy & risk",
    desc: "Market, timeframe, leverage, stop loss, take profit, funding.",
  },
  {
    n: "03",
    title: "Run backtest",
    desc: "Real Perpl candles (Mobula fallback), perp-aware simulation.",
  },
  {
    n: "04",
    title: "Commit onchain",
    desc: "Fingerprint of config + result stored on Monad after each run.",
  },
] as const;

const FEATURES = [
  "Perpl API candles",
  "7 classic strategies",
  "Replay with trade markers",
  "Onchain attestation",
] as const;

export function LandingHero() {
  return (
    <section className="bt-main-panel flex-1 min-h-0 flex flex-col justify-center overflow-y-auto perpl-scroll p-6 md:p-8">
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center text-center">
        <div className="flex items-center gap-3 mb-5">
          <img
            src="https://pbs.twimg.com/profile_images/2061689765854867456/hXUMeXnP_400x400.jpg"
            alt=""
            className="w-12 h-12 rounded-full ring-2 ring-white/10"
          />
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--bt-muted)] font-semibold">
              Perpl · Monad
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              IDEA #141
            </h2>
          </div>
        </div>

        <p className="text-[var(--bt-label)] text-sm md:text-base leading-relaxed max-w-xl">
          Backtest perpetual strategies on{" "}
          <span className="text-white font-medium">real Perpl market data</span> before
          risking capital. Simulate leverage, fees, and funding — then{" "}
          <span className="text-white font-medium">commit a proof onchain</span> that you
          actually tested it.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {FEATURES.map((f) => (
            <span key={f} className="bt-chip px-2.5 py-1 rounded-md text-[11px] text-[var(--bt-muted)]">
              {f}
            </span>
          ))}
        </div>

        <div className="w-full mt-8 grid sm:grid-cols-2 gap-3 text-left">
          {STEPS.map((s) => (
            <div key={s.n} className="bt-panel rounded-[var(--bt-radius-sm)] p-4">
              <span className="text-[10px] font-mono text-[var(--bt-purple-light)] tabular-nums">
                {s.n}
              </span>
              <p className="text-sm font-semibold text-white mt-1">{s.title}</p>
              <p className="text-xs text-[var(--bt-muted)] leading-relaxed mt-1">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="w-full mt-6 bt-panel rounded-[var(--bt-radius-sm)] p-4 text-left">
          <p className="text-[10px] uppercase tracking-widest text-[var(--bt-muted)] font-semibold mb-2">
            Strategies included
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STRATEGY_META.map((s) => (
              <span
                key={s.id}
                className="text-[11px] text-[var(--bt-label)] bg-white/[0.04] px-2 py-0.5 rounded"
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-[var(--bt-muted)] leading-relaxed mt-8 max-w-sm">
          Configure strategy and risk in the drawer on the right, then run from there.
        </p>
      </div>
    </section>
  );
}
