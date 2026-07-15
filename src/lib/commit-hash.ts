import { encodeAbiParameters, getAddress, keccak256, type Address } from "viem";
import type { BacktestResult, StrategyParams, StrategyType, Timeframe } from "@/types";
import type { PeriodConfig } from "@/lib/period";

function toUintScaled(value: number): bigint {
  const scaled = Math.round(value * 100);
  if (scaled < 0) {
    throw new Error(`Value ${value} cannot be negative for unsigned encoding.`);
  }
  return BigInt(scaled);
}

function toSignedScaled(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

export function toSignedUsdCents(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

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
        { type: "int256" },
      ],
      [
        BigInt(input.marketId),
        input.market,
        input.timeframe,
        periodKey,
        input.strategy,
        JSON.stringify(input.params),
        toUintScaled(input.capital),
        BigInt(input.leverage),
        toUintScaled(input.stopLoss),
        toUintScaled(input.takeProfit),
        toUintScaled(input.feeBps),
        input.enableFunding,
        toSignedScaled(input.fundingRateBps),
      ]
    )
  );
}

export function hashBacktestResult(result: BacktestResult): `0x${string}` {
  const m = result.metrics;
  const profitFactorScaled = Number.isFinite(m.profitFactor)
    ? Math.round(m.profitFactor * 10000)
    : 0;

  return keccak256(
    encodeAbiParameters(
      [
        { type: "int256" },
        { type: "int256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "int256" },
      ],
      [
        toSignedScaled(m.totalPnl),
        toSignedScaled(m.finalCapital),
        BigInt(m.totalTrades),
        toUintScaled(m.winRate),
        toUintScaled(m.maxDrawdownPercent),
        BigInt(Math.max(0, profitFactorScaled)),
        toSignedScaled(m.totalFunding),
      ]
    )
  );
}

export function pnlToUsdCents(pnl: number): bigint {
  return toSignedUsdCents(pnl);
}

export function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export async function resolveConnectedAccount(
  provider: NonNullable<ReturnType<typeof getEthereumProvider>>
): Promise<Address> {
  await ensureMonadChain(provider);
  const accounts = (await provider.request({ method: "eth_accounts" })) as Address[];
  if (!accounts[0]) {
    throw new Error("Wallet not connected. Reconnect and try again.");
  }
  return getAddress(accounts[0]);
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
