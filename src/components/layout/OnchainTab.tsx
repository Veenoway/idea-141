"use client";

import { explorerTxUrl } from "@/lib/chain";
import { shortHash } from "@/lib/commit-hash";
import type { WalletCommit } from "@/lib/onchain-history";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui";
import type { Address } from "viem";
import { useCallback, useEffect, useState } from "react";

interface Props {
  walletAddress: Address | null;
  refreshKey?: number;
}

export function OnchainTab({ walletAddress, refreshKey = 0 }: Props) {
  const toast = useToast();
  const [commits, setCommits] = useState<WalletCommit[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setCommits([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/onchain/commits?wallet=${walletAddress}`);
      const data = (await res.json()) as { commits?: WalletCommit[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load commits");
      setCommits(data.commits ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load commits");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!walletAddress) {
    return (
      <p className="text-xs text-[var(--bt-muted)] leading-relaxed">
        Connect your wallet to view onchain commit history.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--bt-muted)] font-semibold">
          Wallet commits
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="text-[10px] text-[var(--bt-accent)] hover:underline disabled:opacity-40"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {loading && commits.length === 0 ? (
        <p className="text-xs text-[var(--bt-muted)]">Loading commits…</p>
      ) : commits.length === 0 ? (
        <p className="text-xs text-[var(--bt-muted)]">No commits yet. Run a backtest to commit onchain.</p>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto perpl-scroll pr-0.5">
          {commits.map((c) => (
            <CommitRow key={`${c.commitId}-${c.txHash}`} commit={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommitRow({ commit }: { commit: WalletCommit }) {
  const positive = commit.pnlUsd >= 0;
  return (
    <div className="bt-panel rounded-[var(--bt-radius-sm)] px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white">#{commit.commitId}</span>
        <Badge tone={positive ? "green" : "red"}>
          {positive ? "+" : ""}${commit.pnlUsd.toFixed(2)}
        </Badge>
      </div>
      <p className="text-[11px] text-[var(--bt-muted)]">
        {commit.strategy} · {commit.market}
      </p>
      <p className="text-[10px] text-[var(--bt-muted)]">
        {commit.committedAt > 0
          ? new Date(commit.committedAt * 1000).toLocaleString()
          : "—"}
      </p>
      <p className="text-[10px] font-mono text-[var(--bt-muted)]">
        {shortHash(commit.configHash)} → {shortHash(commit.resultHash)}
      </p>
      <a
        href={explorerTxUrl(commit.txHash)}
        target="_blank"
        rel="noreferrer"
        className="text-[10px] text-[var(--bt-accent)] hover:underline"
      >
        View transaction →
      </a>
    </div>
  );
}
