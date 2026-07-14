"use client";

import { ensureMonadChain, getEthereumProvider } from "@/lib/commit-hash";
import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";

export function useWallet() {
  const [address, setAddress] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const provider = getEthereumProvider();
      if (!provider) {
        throw new Error("No wallet found. Install MetaMask or Rabby.");
      }

      await ensureMonadChain(provider);
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
      if (!accounts[0]) throw new Error("Wallet connection rejected.");
      setAddress(accounts[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection failed");
      setAddress(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    const provider = getEthereumProvider();
    if (!provider) return;

    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as Address[];
        if (list[0]) setAddress(list[0]);
      })
      .catch(() => {});

    const onAccountsChanged = (accounts: unknown) => {
      const list = accounts as Address[];
      setAddress(list[0] ?? null);
    };

    if ("on" in provider && typeof provider.on === "function") {
      (provider as { on: (event: string, cb: (a: unknown) => void) => void }).on(
        "accountsChanged",
        onAccountsChanged
      );
    }
  }, []);

  return {
    address,
    connected: !!address,
    connecting,
    error,
    connect,
    clearError: () => setError(null),
  };
}
