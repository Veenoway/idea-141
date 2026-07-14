import { encodeAbiParameters, keccak256 } from "viem";
import type { BacktestResult, StrategyParams, StrategyType, Timeframe } from "@/types";
import type { PeriodConfig } from "@/lib/period";

export interface CommitConfigInput {
  marketId: number;
  market: string;
  timeframe: Timeframe;
  period: PeriodConfig;
  strategy: StrategyType;
  params: StrategyParams;
  capital: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  feeBps: number;
  enableFunding: boolean;
  fundingRateBps: number;
}

export function hashBacktestConfig(input: CommitConfigInput): `0x${string}` {
  const periodKey =
    input.period.mode === "days"
      ? `days:${input.period.days}`
      : `range:${input.period.fromDate}:${input.period.toDate}`;

  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "string" },
        { type: "string" },
        { type: "string" },
        { type: "string" },
        { type: "string" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "bool" },
        { type: "uint256" },
      ],
      [
        BigInt(input.marketId),
        input.market,
        input.timeframe,
        periodKey,
        input.strategy,
        JSON.stringify(input.params),
        BigInt(Math.round(input.capital * 100)),
        BigInt(input.leverage),
        BigInt(Math.round(input.stopLoss * 100)),
        BigInt(Math.round(input.takeProfit * 100)),
        BigInt(Math.round(input.feeBps * 100)),
        input.enableFunding,
        BigInt(Math.round(input.fundingRateBps * 100)),
      ]
    )
  );
}

export function hashBacktestResult(result: BacktestResult): `0x${string}` {
  const m = result.metrics;
  return keccak256(
    encodeAbiParameters(
      [
        { type: "int256" },
        { type: "int256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      [
        BigInt(Math.round(m.totalPnl * 100)),
        BigInt(Math.round(m.finalCapital * 100)),
        BigInt(m.totalTrades),
        BigInt(Math.round(m.winRate * 100)),
        BigInt(Math.round(m.maxDrawdownPercent * 100)),
        BigInt(Math.round(m.profitFactor * 10000)),
        BigInt(Math.round(m.totalFunding * 100)),
      ]
    )
  );
}

export function pnlToUsdCents(pnl: number): bigint {
  return BigInt(Math.round(pnl * 100));
}

export function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function getEthereumProvider(): {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
} | null {
  if (typeof window === "undefined") return null;
  const eth = (window as Window & { ethereum?: unknown }).ethereum;
  if (!eth || typeof eth !== "object" || !("request" in eth)) return null;
  return eth as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
}

export async function ensureMonadChain(provider: NonNullable<ReturnType<typeof getEthereumProvider>>) {
  const chainIdHex = "0x8f"; // 143
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code !== 4902) throw err;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: "Monad",
          nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
          rpcUrls: ["https://rpc.monad.xyz"],
          blockExplorerUrls: ["https://monadvision.com"],
        },
      ],
    });
  }
}

export function isRegistryConfigured(address: string | undefined | null): address is `0x${string}` {
  return !!address && address.startsWith("0x") && address.length === 42;
}
