import { fetchMarketIcons } from "@/lib/perpl/markets";
import { cmcIconUrl } from "@/lib/market-icons";
import { MARKETS } from "@/lib/constants";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const fromPerpl = await fetchMarketIcons();

    const icons: Record<string, string> = { ...fromPerpl };
    for (const market of MARKETS) {
      const key = market.name.toUpperCase();
      if (!icons[key]) {
        const fallback = cmcIconUrl(market.name);
        if (fallback) icons[key] = fallback;
      }
    }

    return NextResponse.json(
      { icons },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    const icons: Record<string, string> = {};
    for (const market of MARKETS) {
      const url = cmcIconUrl(market.name);
      if (url) icons[market.name.toUpperCase()] = url;
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch market icons";

    return NextResponse.json(
      { icons, warning: message },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  }
}
