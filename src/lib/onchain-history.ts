import { backtestRegistryAbi } from "@/lib/contracts/backtest-registry";
import { getRegistryAddress } from "@/lib/commit-onchain";
import { BACKTEST_REGISTRY_DEPLOY_BLOCK } from "@/lib/deployed";
import { createMonadPublicClient, getLogsInChunks } from "@/lib/rpc";
import type { Address, Hash } from "viem";

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

export async function fetchWalletCommits(wallet: Address): Promise<WalletCommit[]> {
  const registry = getRegistryAddress();
  if (!registry) return [];

  const client = createMonadPublicClient();
  const latestBlock = await client.getBlockNumber();

  const logs = await getLogsInChunks(
    BACKTEST_REGISTRY_DEPLOY_BLOCK,
    latestBlock,
    (fromBlock, toBlock) =>
      client.getContractEvents({
        address: registry,
        abi: backtestRegistryAbi,
        eventName: "ResultCommitted",
        args: { committer: wallet },
        fromBlock,
        toBlock,
      })
  );

  return logs
    .map((log) => ({
      commitId: log.args.commitId!.toString(),
      txHash: log.transactionHash,
      strategy: log.args.strategy ?? "",
      market: log.args.market ?? "",
      pnlUsd: Number(log.args.totalPnlUsdCents ?? BigInt(0)) / 100,
      committedAt: Number(log.args.committedAt ?? 0),
      configHash: log.args.configHash ?? "",
      resultHash: log.args.resultHash ?? "",
    }))
    .sort((a, b) => Number(BigInt(b.commitId) - BigInt(a.commitId)));
}
