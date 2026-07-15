import { fetchPartialCommitFromRecord } from "@/lib/onchain-history";
import { isAddress } from "viem";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const commitId = req.nextUrl.searchParams.get("commitId");

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (!commitId || !/^\d+$/.test(commitId)) {
    return NextResponse.json({ error: "Invalid commit id" }, { status: 400 });
  }

  try {
    const commit = await fetchPartialCommitFromRecord(BigInt(commitId), wallet);
    return NextResponse.json({ commit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch record";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
