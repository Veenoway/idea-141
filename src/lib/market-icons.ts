/** CoinMarketCap UCID → static logo CDN (fallback when Perpl icon is empty). */
const CMC_IDS: Record<string, number> = {
  BTC: 1,
  ETH: 1027,
  SOL: 5426,
  MON: 30495,
  HYPE: 32196,
  ZEC: 1437,
};

const PERPL_ORIGIN = "https://app.perpl.xyz";

export function cmcIconUrl(symbol: string): string | null {
  const id = CMC_IDS[symbol.toUpperCase()];
  if (!id) return null;
  return `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`;
}

/** Prefer Perpl API icon; fall back to CoinMarketCap. */
export function resolveMarketIconUrl(
  symbol: string,
  perplIcon?: string | null
): string | null {
  const fromPerpl = normalizePerplIconUrl(perplIcon);
  if (fromPerpl) return fromPerpl;
  return cmcIconUrl(symbol);
}

function normalizePerplIconUrl(icon?: string | null): string | null {
  const trimmed = icon?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${PERPL_ORIGIN}${path}`;
}
