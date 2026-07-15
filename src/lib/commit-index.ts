"use client";

import type { WalletCommit } from "@/lib/onchain-history";

const INDEX_KEY = "idea141-commit-index";

type CommitIndex = Record<string, WalletCommit[]>;

function readIndex(): CommitIndex {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CommitIndex;
  } catch {
    return {};
  }
}

function writeIndex(index: CommitIndex) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function loadLocalCommits(wallet: string): WalletCommit[] {
  const list = readIndex()[wallet.toLowerCase()] ?? [];
  return [...list].sort((a, b) => Number(BigInt(b.commitId) - BigInt(a.commitId)));
}

export function saveLocalCommit(wallet: string, commit: WalletCommit) {
  const key = wallet.toLowerCase();
  const index = readIndex();
  const list = index[key] ?? [];
  const next = [commit, ...list.filter((c) => c.commitId !== commit.commitId || c.txHash !== commit.txHash)];
  index[key] = next.sort((a, b) => Number(BigInt(b.commitId) - BigInt(a.commitId)));
  writeIndex(index);
}

export function localTxHashes(wallet: string): string[] {
  return loadLocalCommits(wallet).map((c) => c.txHash);
}
