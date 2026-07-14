"use client";

import {
  appMetadata,
  networks,
  reownEnabled,
  reownProjectId,
  wagmiAdapter,
  wagmiConfig,
} from "@/config/reown";
import { monad } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";

const queryClient = new QueryClient();

if (reownEnabled && wagmiAdapter) {
  createAppKit({
    adapters: [wagmiAdapter],
    projectId: reownProjectId,
    networks,
    defaultNetwork: monad,
    metadata: appMetadata,
    themeMode: "dark",
    features: {
      analytics: false,
    },
  });
}

export function Web3Provider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const [client] = useState(() => queryClient);

  if (!reownEnabled || !wagmiConfig) {
    return <>{children}</>;
  }

  const initialState = cookieToInitialState(wagmiConfig as Config, cookies);

  return (
    <WagmiProvider config={wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
