import { listWalletCommitSources } from "@/lib/onchain-history";
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
  const knownTxHashes = parseTxHashes(req.nextUrl.searchParams.get("txHashes"));

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  try {
    const sources = await listWalletCommitSources(wallet, knownTxHashes);
    return NextResponse.json(sources, {
      headers: { "Cache-Control": "private, s-maxage=30" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list commit sources";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
