"use client";

import type { MarketIconMap } from "@/lib/perpl/markets";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const MarketIconsContext = createContext<MarketIconMap>({});

let cachedIcons: MarketIconMap | null = null;
let inflight: Promise<MarketIconMap> | null = null;

async function loadMarketIcons(): Promise<MarketIconMap> {
  if (cachedIcons) return cachedIcons;
  if (inflight) return inflight;

  inflight = fetch("/api/markets")
    .then((res) => res.json())
    .then((data: { icons: MarketIconMap }) => {
      cachedIcons = data.icons ?? {};
      return cachedIcons;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function MarketIconsProvider({ children }: { children: ReactNode }) {
  const [icons, setIcons] = useState<MarketIconMap>(cachedIcons ?? {});

  useEffect(() => {
    let active = true;
    loadMarketIcons().then((next) => {
      if (active) setIcons(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <MarketIconsContext.Provider value={icons}>
      {children}
    </MarketIconsContext.Provider>
  );
}

export function useMarketIcons(): MarketIconMap {
  return useContext(MarketIconsContext);
}

export function marketIconFromMap(
  icons: MarketIconMap,
  symbol: string
): string | null {
  return icons[symbol.toUpperCase()] ?? null;
}
