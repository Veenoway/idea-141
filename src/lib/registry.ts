import { isRegistryConfigured } from "@/lib/commit-hash";
import { BACKTEST_REGISTRY_ADDRESS } from "@/lib/deployed";

export function getRegistryAddress(): `0x${string}` | null {
  const envAddr = process.env.NEXT_PUBLIC_BACKTEST_REGISTRY_ADDRESS;
  const addr = envAddr && envAddr.length > 0 ? envAddr : BACKTEST_REGISTRY_ADDRESS;
  return isRegistryConfigured(addr) ? addr : null;
}
