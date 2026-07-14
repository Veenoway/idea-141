import { defineChain } from "viem";

export const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "MonadVision",
      url: "https://monadvision.com",
    },
  },
});

export function explorerAddressUrl(address: string) {
  return `${monad.blockExplorers.default.url}/address/${address}`;
}

export function explorerTxUrl(hash: string) {
  return `${monad.blockExplorers.default.url}/tx/${hash}`;
}
