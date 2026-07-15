import { fetchCommitFromReceipt } from "@/lib/onchain-history";
import { isAddress, isHash } from "viem";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const txHash = req.nextUrl.searchParams.get("txHash");

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (!txHash || !isHash(txHash)) {
    return NextResponse.json({ error: "Invalid tx hash" }, { status: 400 });
  }

  try {
    const commit = await fetchCommitFromReceipt(txHash, wallet);
    return NextResponse.json({ commit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch commit";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
