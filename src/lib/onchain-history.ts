import { backtestRegistryAbi } from "@/lib/contracts/backtest-registry";
import { getRegistryAddress } from "@/lib/registry";
import { sleep } from "@/lib/cache";
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

export interface CommitSources {
  commitIds: string[];
  txHashes: Hash[];
}

const SCAN_PAGE_SIZE = 100;
const MAX_SCAN_PAGES = 20;

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

export async function fetchCommitFromReceipt(
  txHash: Hash,
  wallet?: Address
): Promise<WalletCommit | null> {
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

export async function fetchPartialCommitFromRecord(
  commitId: bigint,
  wallet: Address
): Promise<WalletCommit | null> {
  const registry = getRegistryAddress();
  if (!registry) return null;

  const client = createMonadPublicClient();
  const [committer, configHash, resultHash, committedAt] = await withRpcRetry(() =>
    client.readContract({
      address: registry,
      abi: backtestRegistryAbi,
      functionName: "records",
      args: [commitId],
    })
  );

  if (committer.toLowerCase() !== wallet.toLowerCase()) return null;

  return {
    commitId: commitId.toString(),
    txHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash,
    strategy: "—",
    market: "—",
    pnlUsd: 0,
    committedAt: Number(committedAt),
    configHash,
    resultHash,
  };
}

async function fetchScanPage(wallet: Address, page: number): Promise<Hash[]> {
  const registry = getRegistryAddress();
  if (!registry) return [];

  const apiKey = process.env.MONADSCAN_API_KEY ?? "";
  const url = apiKey
    ? `https://api.monadscan.com/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=${page}&offset=${SCAN_PAGE_SIZE}&sort=desc&apikey=${apiKey}`
    : `https://api.etherscan.io/v2/api?chainid=143&module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=${page}&offset=${SCAN_PAGE_SIZE}&sort=desc`;

  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
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

async function fetchAllRegistryTxHashesFromScan(wallet: Address): Promise<Hash[]> {
  const all: Hash[] = [];

  for (let page = 1; page <= MAX_SCAN_PAGES; page++) {
    const batch = await fetchScanPage(wallet, page);
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < SCAN_PAGE_SIZE) break;
    await sleep(200);
  }

  return [...new Set(all.map((h) => h.toLowerCase()))] as Hash[];
}

async function listUserCommitIds(wallet: Address): Promise<string[]> {
  const registry = getRegistryAddress();
  if (!registry) return [];

  const client = createMonadPublicClient();
  const ids = await withRpcRetry(() =>
    client.readContract({
      address: registry,
      abi: backtestRegistryAbi,
      functionName: "commitsByUser",
      args: [wallet],
    })
  );

  return ids.map((id) => id.toString()).sort((a, b) => Number(BigInt(b) - BigInt(a)));
}

export async function listWalletCommitSources(
  wallet: Address,
  knownTxHashes: Hash[] = []
): Promise<CommitSources> {
  const [commitIds, scanned] = await Promise.all([
    listUserCommitIds(wallet),
    fetchAllRegistryTxHashesFromScan(wallet),
  ]);

  const txHashes = [
    ...new Set([
      ...knownTxHashes.map((h) => h.toLowerCase()),
      ...scanned.map((h) => h.toLowerCase()),
    ]),
  ] as Hash[];

  return { commitIds, txHashes };
}

export function mergeCommits(existing: WalletCommit[], incoming: WalletCommit[]): WalletCommit[] {
  const byId = new Map<string, WalletCommit>();
  for (const c of [...existing, ...incoming]) {
    const prev = byId.get(c.commitId);
    if (!prev || c.txHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      byId.set(c.commitId, c);
    }
  }
  return [...byId.values()].sort((a, b) => Number(BigInt(b.commitId) - BigInt(a.commitId)));
}
