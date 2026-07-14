import { fetchWalletCommits } from "@/lib/onchain-history";
import { isAddress } from "viem";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const commits = await fetchWalletCommits(wallet);
    return NextResponse.json(
      { commits },
      {
        headers: {
          "Cache-Control": "private, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch onchain history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
