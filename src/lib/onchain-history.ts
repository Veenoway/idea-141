import { backtestRegistryAbi } from "@/lib/contracts/backtest-registry";
import { getRegistryAddress } from "@/lib/registry";
import { getCached, setCache, sleep } from "@/lib/cache";
import { createMonadPublicClient, withRpcRetry } from "@/lib/rpc";
import { decodeEventLog, type Address, type Hash, type Log } from "viem";

export interface WalletCommit {
  commitId: string;
  txHash: Hash;
  strategy: string;
  market: string;
  pnlUsd: number;
  committedAt: number;
  configHash: string;
  resultHash: string;
}

interface CommitsCacheEntry {
  commits: WalletCommit[];
  txHashes: string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function parseCommitFromReceiptLog(log: Log, txHash: Hash, wallet?: Address): WalletCommit | null {
  const registry = getRegistryAddress();
  if (!registry || log.address.toLowerCase() !== registry.toLowerCase()) return null;

  try {
    const decoded = decodeEventLog({
      abi: backtestRegistryAbi,
      data: log.data,
      topics: log.topics,
    });
    if (decoded.eventName !== "ResultCommitted") return null;

    const args = decoded.args as {
      commitId: bigint;
      committer: Address;
      strategy: string;
      market: string;
      totalPnlUsdCents: bigint;
      committedAt: number | bigint;
      configHash: string;
      resultHash: string;
    };

    if (wallet && args.committer.toLowerCase() !== wallet.toLowerCase()) return null;

    return {
      commitId: args.commitId.toString(),
      txHash,
      strategy: args.strategy ?? "",
      market: args.market ?? "",
      pnlUsd: Number(args.totalPnlUsdCents ?? BigInt(0)) / 100,
      committedAt: Number(args.committedAt ?? 0),
      configHash: args.configHash ?? "",
      resultHash: args.resultHash ?? "",
    };
  } catch {
    return null;
  }
}

async function fetchCommitFromReceipt(txHash: Hash, wallet?: Address): Promise<WalletCommit | null> {
  const client = createMonadPublicClient();
  const receipt = await withRpcRetry(() =>
    client.getTransactionReceipt({ hash: txHash })
  );
  if (receipt.status !== "success") return null;

  for (const log of receipt.logs) {
    const commit = parseCommitFromReceiptLog(log, txHash, wallet);
    if (commit) return commit;
  }
  return null;
}

async function fetchRegistryTxHashesFromScan(wallet: Address): Promise<Hash[]> {
  const registry = getRegistryAddress();
  if (!registry) return [];

  const apiKey = process.env.MONADSCAN_API_KEY ?? "";
  const base = apiKey
    ? `https://api.monadscan.com/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${apiKey}`
    : `https://api.etherscan.io/v2/api?chainid=143&module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc`;

  try {
    const res = await fetch(base, { next: { revalidate: 60 } });
    const data = (await res.json()) as {
      status?: string;
      result?: { hash: string; to?: string }[] | string;
    };
    if (data.status !== "1" || !Array.isArray(data.result)) return [];

    return data.result
      .filter((tx) => tx.to?.toLowerCase() === registry.toLowerCase())
      .map((tx) => tx.hash as Hash);
  } catch {
    return [];
  }
}

async function fetchCommitsFromTxHashes(
  wallet: Address,
  txHashes: Hash[]
): Promise<WalletCommit[]> {
  const unique = [...new Set(txHashes.map((h) => h.toLowerCase()))] as Hash[];
  const commits: WalletCommit[] = [];

  for (const txHash of unique) {
    const commit = await fetchCommitFromReceipt(txHash, wallet);
    if (commit) commits.push(commit);
    await sleep(150);
  }

  return commits;
}

function mergeCommits(existing: WalletCommit[], incoming: WalletCommit[]): WalletCommit[] {
  const byKey = new Map<string, WalletCommit>();
  for (const c of [...existing, ...incoming]) {
    byKey.set(`${c.commitId}-${c.txHash}`, c);
  }
  return [...byKey.values()].sort((a, b) => Number(BigInt(b.commitId) - BigInt(a.commitId)));
}

export async function fetchWalletCommits(
  wallet: Address,
  knownTxHashes: Hash[] = []
): Promise<WalletCommit[]> {
  const registry = getRegistryAddress();
  if (!registry) return [];

  const cacheKey = `commits:${wallet.toLowerCase()}`;
  const cached = getCached<CommitsCacheEntry>(cacheKey);

  const scanned = await fetchRegistryTxHashesFromScan(wallet);
  const txHashes = [...new Set([...knownTxHashes, ...scanned, ...(cached?.txHashes ?? [])])] as Hash[];

  const alreadyHave = new Set((cached?.commits ?? []).map((c) => c.txHash.toLowerCase()));
  const toFetch = txHashes.filter((h) => !alreadyHave.has(h.toLowerCase()));

  let fresh: WalletCommit[] = [];
  if (toFetch.length > 0) {
    fresh = await fetchCommitsFromTxHashes(wallet, toFetch);
  }

  const commits = mergeCommits(cached?.commits ?? [], fresh);

  setCache(
    cacheKey,
    { commits, txHashes: commits.map((c) => c.txHash) },
    CACHE_TTL_MS
  );

  return commits;
}

export function getCachedWalletCommits(wallet: Address): WalletCommit[] | null {
  const cached = getCached<CommitsCacheEntry>(`commits:${wallet.toLowerCase()}`);
  return cached?.commits ?? null;
}

export async function refreshWalletCommits(
  wallet: Address,
  knownTxHashes: Hash[] = []
): Promise<WalletCommit[]> {
  const cacheKey = `commits:${wallet.toLowerCase()}`;
  const scanned = await fetchRegistryTxHashesFromScan(wallet);
  const txHashes = [...new Set([...knownTxHashes, ...scanned])] as Hash[];
  const commits = await fetchCommitsFromTxHashes(wallet, txHashes);

  setCache(
    cacheKey,
    { commits, txHashes: commits.map((c) => c.txHash) },
    CACHE_TTL_MS
  );

  return commits;
}
