"use client";

import { explorerTxUrl } from "@/lib/chain";
import { shortHash } from "@/lib/commit-hash";
import { loadLocalCommits, localTxHashes } from "@/lib/commit-index";
import { loadCommitSnapshot, type StoredCommitSnapshot } from "@/lib/commit-snapshots";
import { mergeCommits, type WalletCommit } from "@/lib/onchain-history";
import { useToast } from "@/hooks/useToast";
import { Badge } from "@/components/ui";
import type { Address } from "viem";
import { useCallback, useEffect, useRef, useState } from "react";

const ZERO_TX = "0x0000000000000000000000000000000000000000000000000000000000000000";

interface Props {
  walletAddress: Address | null;
  refreshKey?: number;
  onCommitSelect?: (snapshot: StoredCommitSnapshot) => void;
}

export function OnchainTab({ walletAddress, refreshKey = 0, onCommitSelect }: Props) {
  const toast = useToast();
  const [commits, setCommits] = useState<WalletCommit[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const appendCommit = useCallback((commit: WalletCommit) => {
    setCommits((prev) => mergeCommits(prev, [commit]));
  }, []);

  const syncCommits = useCallback(
    async (force = false) => {
      if (!walletAddress) {
        setCommits([]);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const local = loadLocalCommits(walletAddress);
      if (local.length > 0) {
        setCommits((prev) => (force ? mergeCommits([], local) : mergeCommits(prev, local)));
      }

      setSyncing(true);
      setLoadProgress(null);

      try {
        const txParam = localTxHashes(walletAddress).join(",");
        const sourcesUrl =
          `/api/onchain/commits/sources?wallet=${walletAddress}` +
          (txParam ? `&txHashes=${encodeURIComponent(txParam)}` : "");

        const sourcesRes = await fetch(sourcesUrl, { signal: controller.signal });
        const sourcesData = (await sourcesRes.json()) as {
          commitIds?: string[];
          txHashes?: string[];
          error?: string;
        };
        if (!sourcesRes.ok) throw new Error(sourcesData.error ?? "Failed to list commits");

        const commitIds = sourcesData.commitIds ?? [];
        const txHashes = sourcesData.txHashes ?? [];
        const loadedIds = new Set(local.map((c) => c.commitId));
        const loadedTx = new Set(local.map((c) => c.txHash.toLowerCase()));

        const txsToFetch = txHashes.filter((h) => !loadedTx.has(h.toLowerCase()));
        const idsToFetch = commitIds.filter((id) => !loadedIds.has(id));
        const total = txsToFetch.length + idsToFetch.length;
        let done = 0;

        if (total > 0) setLoadProgress({ done: 0, total });

        for (const txHash of txsToFetch) {
          if (controller.signal.aborted) return;
          try {
            const res = await fetch(
              `/api/onchain/commits/one?wallet=${walletAddress}&txHash=${txHash}`,
              { signal: controller.signal }
            );
            const data = (await res.json()) as { commit?: WalletCommit | null };
            if (data.commit) {
              loadedIds.add(data.commit.commitId);
              appendCommit(data.commit);
            }
          } catch {
            /* skip failed tx */
          }
          done++;
          setLoadProgress({ done, total });
        }

        for (const commitId of idsToFetch) {
          if (controller.signal.aborted) return;
          if (loadedIds.has(commitId)) {
            done++;
            setLoadProgress({ done, total });
            continue;
          }
          try {
            const res = await fetch(
              `/api/onchain/commits/record?wallet=${walletAddress}&commitId=${commitId}`,
              { signal: controller.signal }
            );
            const data = (await res.json()) as { commit?: WalletCommit | null };
            if (data.commit) {
              loadedIds.add(data.commit.commitId);
              appendCommit(data.commit);
            }
          } catch {
            /* skip */
          }
          done++;
          setLoadProgress({ done, total });
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        if (local.length === 0) {
          toast.error(e instanceof Error ? e.message : "Failed to load commits");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSyncing(false);
          setLoadProgress(null);
        }
      }
    },
    [walletAddress, toast, appendCommit]
  );

  useEffect(() => {
    if (!walletAddress) {
      setCommits([]);
      return;
    }
    const local = loadLocalCommits(walletAddress);
    if (local.length > 0) setCommits(local);
    void syncCommits(false);
    return () => abortRef.current?.abort();
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-[var(--bt-muted)] font-semibold">
          Wallet commits
        </p>
        <button
          type="button"
          onClick={() => syncCommits(true)}
          disabled={syncing}
          className="text-[10px] text-[var(--bt-accent)] hover:underline disabled:opacity-40"
        >
          {syncing ? "Syncing…" : "Refresh"}
        </button>
      </div>

      {commits.length === 0 && syncing && !loadProgress ? (
        <p className="text-xs text-[var(--bt-muted)]">Discovering onchain commits…</p>
      ) : commits.length === 0 && !syncing ? (
        <p className="text-xs text-[var(--bt-muted)]">No commits yet. Run a backtest to commit onchain.</p>
      ) : (
        <div className="relative space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto perpl-scroll pr-0.5">
          {loadProgress && (
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2 py-1 rounded-[var(--bt-radius-sm)] bg-[var(--paper-3)]/90 text-[10px] text-[var(--bt-muted)] backdrop-blur-sm">
              <span className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-[var(--bt-purple)] border-t-transparent rounded-full animate-spin" />
                Loading commits…
              </span>
              <span className="tabular-nums">
                {loadProgress.done}/{loadProgress.total}
              </span>
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
  const hasTx = commit.txHash.toLowerCase() !== ZERO_TX;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left bt-panel rounded-[var(--bt-radius-sm)] px-3 py-2.5 space-y-1.5 hover:brightness-110 transition-[filter] cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white">#{commit.commitId}</span>
        {commit.pnlUsd !== 0 || commit.strategy !== "—" ? (
          <Badge tone={positive ? "green" : "red"}>
            {positive ? "+" : ""}${commit.pnlUsd.toFixed(2)}
          </Badge>
        ) : (
          <Badge tone="muted">onchain</Badge>
        )}
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
      {hasTx && (
        <a
          href={explorerTxUrl(commit.txHash)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-[var(--bt-muted)] hover:text-[var(--bt-accent)] hover:underline inline-block"
        >
          View transaction ↗
        </a>
      )}
    </button>
  );
}
