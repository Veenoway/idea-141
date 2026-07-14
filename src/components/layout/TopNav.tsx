"use client";

export function TopNav() {
  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--perpl-border)] bg-[var(--perpl-bg)] shrink-0">
      <div className="flex items-center gap-6 lg:gap-8 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <PerplLogo />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-[var(--perpl-muted)] font-medium">
            Beta
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-5 text-sm overflow-x-auto perpl-scroll">
          <NavLink>Trade</NavLink>
          <NavLink>Portfolio</NavLink>
          <NavLink>Leaderboard</NavLink>
          <NavLink active>Backtest</NavLink>
          <NavLink>Points</NavLink>
          <NavLink>Referrals</NavLink>
          <NavLink muted>Tools ▾</NavLink>
        </nav>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="hidden sm:inline text-xs px-3 py-1.5 rounded-md border border-[var(--perpl-border)] text-[var(--perpl-muted)] hover:text-white"
        >
          Refer
        </button>
        <button
          type="button"
          className="text-xs px-3 py-1.5 rounded-md bg-[var(--perpl-purple)] text-white font-medium hover:opacity-90"
        >
          Deposit ▾
        </button>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--perpl-border)] bg-[var(--perpl-surface)] text-xs">
          <span className="w-4 h-4 rounded bg-[var(--perpl-purple)]/30 flex items-center justify-center">
            <span className="w-2 h-2 rounded-sm bg-[var(--perpl-purple)]" />
          </span>
          <span className="text-white tabular-nums">0x77…9135</span>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  children,
  active,
  muted,
}: {
  children: React.ReactNode;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <span
      className={
        active
          ? "text-white font-medium border-b-2 border-[var(--perpl-purple)] pb-3 -mb-3"
          : muted
            ? "text-[var(--perpl-muted)] cursor-default whitespace-nowrap"
            : "text-[var(--perpl-muted)] hover:text-white cursor-default whitespace-nowrap"
      }
    >
      {children}
    </span>
  );
}

function PerplLogo() {
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" fill="none" aria-label="Perpl">
      <text x="0" y="16" fill="#a855f7" fontSize="16" fontWeight="700" fontFamily="inherit">
        Perpl
      </text>
    </svg>
  );
}
