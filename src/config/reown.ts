import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { monad } from "@reown/appkit/networks";
import type { Config } from "@wagmi/core";
import type { Chain } from "viem";
import { cookieStorage, createStorage } from "wagmi";

export const reownProjectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_PROJECT_ID?.trim() ||
  "";

export const reownEnabled = reownProjectId.length > 0;

export const appMetadata = {
  name: "IDEA #141",
  description: "Perp backtest bench on Perpl / Monad",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  icons: ["https://pbs.twimg.com/profile_images/2061689765854867456/hXUMeXnP_400x400.jpg"],
};

export const networks = [monad] as [Chain, ...Chain[]];

export const wagmiAdapter = reownEnabled
  ? new WagmiAdapter({
      projectId: reownProjectId,
      networks,
      ssr: true,
      storage: createStorage({ storage: cookieStorage }),
    })
  : null;

export const wagmiConfig = (wagmiAdapter?.wagmiConfig ?? null) as Config | null;
