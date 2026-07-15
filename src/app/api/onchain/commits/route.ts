import { fetchWalletCommits, refreshWalletCommits } from "@/lib/onchain-history";
import { isAddress, type Hash } from "viem";
import { NextRequest, NextResponse } from "next/server";

function parseTxHashes(raw: string | null): Hash[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("0x") && s.length === 66) as Hash[];
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const force = req.nextUrl.searchParams.get("refresh") === "1";
  const knownTxHashes = parseTxHashes(req.nextUrl.searchParams.get("txHashes"));

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const commits = force
      ? await refreshWalletCommits(wallet, knownTxHashes)
      : await fetchWalletCommits(wallet, knownTxHashes);
    return NextResponse.json(
      { commits },
      {
        headers: {
          "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch onchain history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
