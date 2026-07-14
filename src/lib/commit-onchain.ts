import { MARKETS } from "@/lib/constants";
import { backtestRegistryAbi } from "@/lib/contracts/backtest-registry";
import { monad } from "@/lib/chain";
import {
  getEthereumProvider,
  hashBacktestConfig,
  hashBacktestResult,
  isRegistryConfigured,
  pnlToUsdCents,
  resolveConnectedAccount,
  type CommitConfigInput,
} from "@/lib/commit-hash";
import { BACKTEST_REGISTRY_ADDRESS } from "@/lib/deployed";
import type { BacktestResult } from "@/types";
import { createMonadPublicClient } from "@/lib/rpc";
import { createWalletClient, custom, type Address, type Hash } from "viem";

export function getRegistryAddress(): `0x${string}` | null {
  const envAddr = process.env.NEXT_PUBLIC_BACKTEST_REGISTRY_ADDRESS;
  const addr = envAddr && envAddr.length > 0 ? envAddr : BACKTEST_REGISTRY_ADDRESS;
  return isRegistryConfigured(addr) ? addr : null;
}

export interface CommitOnchainInput extends CommitConfigInput {
  result: BacktestResult;
  walletAddress: Address;
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

  const provider = getEthereumProvider();
  if (!provider) throw new Error("No wallet found.");

  const account = await resolveConnectedAccount(provider);

  const market =
    input.market ||
    MARKETS.find((m) => m.id === input.marketId)?.name ||
    "UNKNOWN";

  const configHash = hashBacktestConfig({ ...input, market });
  const resultHash = hashBacktestResult(input.result);

  const walletClient = createWalletClient({
    account,
    chain: monad,
    transport: custom(provider),
  });

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

  try {
    await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 120_000,
    });
  } catch {
    // Tx was already submitted — receipt polling can fail without invalidating the send.
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
