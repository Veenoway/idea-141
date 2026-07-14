"use client";

import { wagmiConfig, reownEnabled } from "@/config/reown";
import { monad } from "@/lib/chain";
import {
  ensureMonadChain,
  getEthereumProvider,
  resolveConnectedAccount,
} from "@/lib/commit-hash";
import { getAccount, getWalletClient, switchChain } from "@wagmi/core";
import type { Address, WalletClient } from "viem";

async function getConnectorProvider() {
  if (!wagmiConfig) return null;
  const { connector } = getAccount(wagmiConfig);
  if (!connector) return null;
  const provider = await connector.getProvider();
  if (!provider || typeof provider !== "object" || !("request" in provider)) return null;
  return provider as NonNullable<ReturnType<typeof getEthereumProvider>>;
}

export async function ensureMonadNetwork() {
  if (reownEnabled && wagmiConfig) {
    try {
      await switchChain(wagmiConfig, { chainId: monad.id });
      return;
    } catch {
      const provider = await getConnectorProvider();
      if (provider) {
        await ensureMonadChain(provider);
        return;
      }
    }
  }

  const provider = getEthereumProvider();
  if (provider) await ensureMonadChain(provider);
}

export async function resolveWalletAccount(): Promise<Address> {
  if (reownEnabled && wagmiConfig) {
    const account = getAccount(wagmiConfig);
    if (!account.address) {
      throw new Error("Wallet not connected. Reconnect and try again.");
    }
    await ensureMonadNetwork();
    return account.address;
  }

  const provider = getEthereumProvider();
  if (!provider) throw new Error("No wallet found.");
  return resolveConnectedAccount(provider);
}

export async function getActiveWalletClient(): Promise<WalletClient> {
  if (reownEnabled && wagmiConfig) {
    await ensureMonadNetwork();
    const client = await getWalletClient(wagmiConfig, { chainId: monad.id });
    if (!client) throw new Error("No wallet found.");
    return client;
  }

  const provider = getEthereumProvider();
  if (!provider) throw new Error("No wallet found.");

  const account = await resolveConnectedAccount(provider);
  const { createWalletClient, custom } = await import("viem");
  return createWalletClient({
    account,
    chain: monad,
    transport: custom(provider),
  });
}
