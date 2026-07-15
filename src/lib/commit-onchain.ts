"use client";

import { MARKETS } from "@/lib/constants";
import { backtestRegistryAbi } from "@/lib/contracts/backtest-registry";
import { monad } from "@/lib/chain";
import {
  hashBacktestConfig,
  hashBacktestResult,
  pnlToUsdCents,
  type CommitConfigInput,
} from "@/lib/commit-hash";
import { getRegistryAddress } from "@/lib/registry";
import { getActiveWalletClient, resolveWalletAccount } from "@/lib/wallet-session";
import type { BacktestResult } from "@/types";
import { createMonadPublicClient } from "@/lib/rpc";
import type { Hash } from "viem";

export { getRegistryAddress } from "@/lib/registry";

export interface CommitOnchainInput extends CommitConfigInput {
  result: BacktestResult;
  walletAddress: `0x${string}`;
}

export interface CommitOnchainResult {
  txHash: Hash;
  commitId: string;
  configHash: `0x${string}`;
  resultHash: `0x${string}`;
}

export async function commitBacktestOnchain(
  input: CommitOnchainInput
): Promise<CommitOnchainResult> {
  const registryAddress = getRegistryAddress();
  if (!registryAddress) {
    throw new Error("Registry contract not configured.");
  }

  const account = await resolveWalletAccount();
  if (account.toLowerCase() !== input.walletAddress.toLowerCase()) {
    throw new Error("Connected wallet changed. Reconnect and try again.");
  }

  const market =
    input.market ||
    MARKETS.find((m) => m.id === input.marketId)?.name ||
    "UNKNOWN";

  const configHash = hashBacktestConfig({ ...input, market });
  const resultHash = hashBacktestResult(input.result);

  const walletClient = await getActiveWalletClient();

  const publicClient = createMonadPublicClient();

  const txHash = await walletClient.writeContract({
    address: registryAddress,
    abi: backtestRegistryAbi,
    functionName: "commitResult",
    chain: monad,
    account,
    args: [
      configHash,
      resultHash,
      input.strategy,
      market,
      pnlToUsdCents(input.result.metrics.totalPnl),
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 120_000,
  });

  if (receipt.status !== "success") {
    throw new Error("Transaction failed on-chain.");
  }

  const commitId = await publicClient.readContract({
    address: registryAddress,
    abi: backtestRegistryAbi,
    functionName: "totalCommits",
  });

  return {
    txHash,
    commitId: commitId.toString(),
    configHash,
    resultHash,
  };
}
