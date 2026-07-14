"use client";

import { reownEnabled } from "@/config/reown";
import { ensureMonadChain, getEthereumProvider } from "@/lib/commit-hash";
import { useAppKit, useAppKitState } from "@reown/appkit/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";

export interface WalletState {
  address: Address | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

function ReownWalletProvider({ children }: { children: ReactNode }) {
  const { open } = useAppKit();
  const { loading: appKitLoading } = useAppKitState();
  const { address, isConnecting, isReconnecting } = useAccount();
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet connection failed");
    }
  }, [open]);

  const value: WalletState = {
    address: address ?? null,
    connected: !!address,
    connecting: isConnecting || isReconnecting || appKitLoading,
    error,
    connect,
    clearError: () => setError(null),
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

function LegacyWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const provider = getEthereumProvider();
      if (!provider) {
        throw new Error(
          "No wallet found. Set NEXT_PUBLIC_REOWN_PROJECT_ID for WalletConnect, or install MetaMask / Rabby."
        );
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

  const value: WalletState = {
    address,
    connected: !!address,
    connecting,
    error,
    connect,
    clearError: () => setError(null),
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  if (reownEnabled) return <ReownWalletProvider>{children}</ReownWalletProvider>;
  return <LegacyWalletProvider>{children}</LegacyWalletProvider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
