import { sleep } from "@/lib/cache";
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
  return getLogsInChunksParallel(fromBlock, toBlock, fetchChunk);
}

export async function getLogsInChunksParallel<T>(
  fromBlock: bigint,
  toBlock: bigint,
  fetchChunk: (from: bigint, to: bigint) => Promise<T[]>
): Promise<T[]> {
  const ranges: { from: bigint; to: bigint }[] = [];
  let cursor = fromBlock;

  while (cursor <= toBlock) {
    const chunkEnd =
      cursor + LOG_BLOCK_RANGE - BigInt(1) > toBlock ? toBlock : cursor + LOG_BLOCK_RANGE - BigInt(1);
    ranges.push({ from: cursor, to: chunkEnd });
    cursor = chunkEnd + BigInt(1);
  }

  const out: T[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const chunk = await withRpcRetry(() => fetchChunk(r.from, r.to));
    out.push(...chunk);
    if (i < ranges.length - 1) await sleep(120);
  }

  return out;
}

export async function withRpcRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("429") ||
        message.includes("Too Many Requests") ||
        message.includes("rate limit") ||
        message.includes("503");
      if (!retryable || attempt === maxAttempts - 1) throw error;
      await sleep(400 * 2 ** attempt);
    }
  }
  throw lastError;
}
