"use client";

import { marketIconFromMap, useMarketIcons } from "@/hooks/useMarketIcons";
import { useState } from "react";

export function MarketIcon({
  symbol,
  size = 18,
  iconUrl,
}: {
  symbol: string;
  size?: number;
  iconUrl?: string | null;
}) {
  const icons = useMarketIcons();
  const [failed, setFailed] = useState(false);
  const url = iconUrl ?? marketIconFromMap(icons, symbol);

  if (!url || failed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-[var(--bt-card-hover)] text-[10px] font-semibold text-white shrink-0"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {symbol.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="rounded-full shrink-0 object-cover"
      onError={() => setFailed(true)}
    />
  );
}
