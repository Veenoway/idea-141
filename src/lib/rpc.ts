import { monad } from "@/lib/chain";
import { createPublicClient, http, type PublicClient } from "viem";

export function getMonadRpcUrl(): string {
  return process.env.MONAD_RPC_URL ?? monad.rpcUrls.default.http[0];
}

export function createMonadPublicClient(): PublicClient {
  return createPublicClient({
    chain: monad,
    transport: http(getMonadRpcUrl()),
  });
}

/** Monad public RPC limits eth_getLogs to 100 blocks per request. */
export const LOG_BLOCK_RANGE = BigInt(100);

export async function getLogsInChunks<T>(
  fromBlock: bigint,
  toBlock: bigint,
  fetchChunk: (from: bigint, to: bigint) => Promise<T[]>
): Promise<T[]> {
  const out: T[] = [];
  let cursor = fromBlock;

  while (cursor <= toBlock) {
    const chunkEnd =
      cursor + LOG_BLOCK_RANGE - BigInt(1) > toBlock ? toBlock : cursor + LOG_BLOCK_RANGE - BigInt(1);
    const chunk = await fetchChunk(cursor, chunkEnd);
    out.push(...chunk);
    cursor = chunkEnd + BigInt(1);
  }

  return out;
}
