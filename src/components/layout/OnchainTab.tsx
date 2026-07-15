"use client";

import { explorerTxUrl } from "@/lib/chain";
import { shortHash } from "@/lib/commit-hash";
import { loadLocalCommits, localTxHashes } from "@/lib/commit-index";
import { loadCommitSnapshot, type StoredCommitSnapshot } from "@/lib/commit-snapshots";
import type { WalletCommit } from "@/lib/onchain-history";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui";
import type { Address } from "viem";
import { useCallback, useEffect, useRef, useState } from "react";

function mergeCommitLists(local: WalletCommit[], remote: WalletCommit[]): WalletCommit[] {
  const byKey = new Map<string, WalletCommit>();
  for (const c of [...local, ...remote]) {
    byKey.set(`${c.commitId}-${c.txHash}`, c);
  }
  return [...byKey.values()].sort((a, b) => Number(BigInt(b.commitId) - BigInt(a.commitId)));
}

interface Props {
  walletAddress: Address | null;
  refreshKey?: number;
  onCommitSelect?: (snapshot: StoredCommitSnapshot) => void;
}

export function OnchainTab({ walletAddress, refreshKey = 0, onCommitSelect }: Props) {
  const toast = useToast();
  const [commits, setCommits] = useState<WalletCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const commitsCountRef = useRef(0);
  commitsCountRef.current = commits.length;

  const load = useCallback(
    async (force = false) => {
      if (!walletAddress) {
        setCommits([]);
        return;
      }

      const local = loadLocalCommits(walletAddress);
      const hasCached = commitsCountRef.current > 0 || local.length > 0;
      if (hasCached) setRefreshing(true);
      else setLoading(true);

      if (local.length > 0 && commitsCountRef.current === 0) {
        setCommits(local);
      }

      try {
        const txParam = localTxHashes(walletAddress).join(",");
        const url =
          `/api/onchain/commits?wallet=${walletAddress}` +
          (force ? "&refresh=1" : "") +
          (txParam ? `&txHashes=${encodeURIComponent(txParam)}` : "");
        const res = await fetch(url);
        const data = (await res.json()) as { commits?: WalletCommit[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load commits");
        setCommits(mergeCommitLists(local, data.commits ?? []));
      } catch (e) {
        if (local.length > 0) {
          setCommits(local);
        } else {
          toast.error(e instanceof Error ? e.message : "Failed to load commits");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [walletAddress, toast]
  );

  useEffect(() => {
    if (!walletAddress) {
      setCommits([]);
      return;
    }
    const local = loadLocalCommits(walletAddress);
    if (local.length > 0) setCommits(local);
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, refreshKey]);

  const handleCommitClick = useCallback(
    (commit: WalletCommit) => {
      const snapshot = loadCommitSnapshot(commit.configHash);
      if (!snapshot) {
        toast.error("Config not saved locally — only commits from this browser can be re-run.");
        return;
      }
      onCommitSelect?.(snapshot);
    },
    [onCommitSelect, toast]
  );

  if (!walletAddress) {
    return (
      <p className="text-xs text-[var(--bt-muted)] leading-relaxed">
        Connect your wallet to view onchain commit history.
      </p>
    );
  }

  const initialLoading = loading && commits.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--bt-muted)] font-semibold">
          Wallet commits
        </p>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="text-[10px] text-[var(--bt-accent)] hover:underline disabled:opacity-40"
        >
          {refreshing ? "Syncing…" : loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {initialLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bt-panel rounded-[var(--bt-radius-sm)] px-3 py-2.5 h-[88px] animate-pulse bg-white/[0.02]"
            />
          ))}
        </div>
      ) : commits.length === 0 ? (
        <p className="text-xs text-[var(--bt-muted)]">No commits yet. Run a backtest to commit onchain.</p>
      ) : (
        <div className="relative space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto perpl-scroll pr-0.5">
          {refreshing && (
            <div className="sticky top-0 z-10 flex items-center gap-2 px-2 py-1 rounded-[var(--bt-radius-sm)] bg-[var(--paper-3)]/90 text-[10px] text-[var(--bt-muted)] backdrop-blur-sm">
              <span className="inline-block w-3 h-3 border-2 border-[var(--bt-purple)] border-t-transparent rounded-full animate-spin" />
              Syncing commits…
            </div>
          )}
          {commits.map((c) => (
            <CommitRow
              key={`${c.commitId}-${c.txHash}`}
              commit={c}
              onSelect={() => handleCommitClick(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommitRow({ commit, onSelect }: { commit: WalletCommit; onSelect: () => void }) {
  const positive = commit.pnlUsd >= 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left bt-panel rounded-[var(--bt-radius-sm)] px-3 py-2.5 space-y-1.5 hover:brightness-110 transition-[filter] cursor-pointer"
    >
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
      <p className="text-[10px] text-[var(--bt-accent)]">Re-run backtest →</p>
      <a
        href={explorerTxUrl(commit.txHash)}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-[10px] text-[var(--bt-muted)] hover:text-[var(--bt-accent)] hover:underline inline-block"
      >
        View transaction ↗
      </a>
    </button>
  );
}
