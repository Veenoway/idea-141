import { hashBacktestConfig } from "@/lib/commit-hash";
import type { CommitOnchainInput } from "@/lib/commit-onchain";

const STORAGE_KEY = "idea141-commit-snapshots";

export interface StoredCommitSnapshot extends CommitOnchainInput {
  pairMarketId?: number;
  savedAt: number;
}

function readStore(): Record<string, StoredCommitSnapshot> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredCommitSnapshot>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredCommitSnapshot>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveCommitSnapshot(input: CommitOnchainInput, pairMarketId?: number): void {
  const key = hashBacktestConfig({ ...input, market: input.market });
  const store = readStore();
  store[key] = {
    ...input,
    pairMarketId,
    savedAt: Date.now(),
  };
  writeStore(store);
}

export function loadCommitSnapshot(configHash: string): StoredCommitSnapshot | null {
  const store = readStore();
  return store[configHash] ?? null;
}
