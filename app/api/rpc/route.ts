/**
 * DEVELOPMENT-ONLY JSON-RPC proxy, used when NEXT_PUBLIC_RPC_URL is unset.
 * The public mainnet RPC rejects browser-origin requests (403), so local
 * development without a Helius key would otherwise be impossible.
 *
 * It holds no keys, forwards only read methods plus simulation/sending of
 * already-signed transactions, and returns 404 in production builds.
 */
import { NextResponse } from "next/server";

const UPSTREAM = "https://api.mainnet-beta.solana.com";
const ALLOWED = new Set([
  "getTokenAccountsByOwner",
  "getMultipleAccounts",
  "getBalance",
  "getLatestBlockhash",
  "getRecentPrioritizationFees",
  "getMinimumBalanceForRentExemption",
  "simulateTransaction",
  "sendTransaction",
  "getSignatureStatuses",
  "getBlockHeight",
  "getAccountInfo",
  // DAS (compressed NFTs). The public RPC doesn't serve these; they fail cleanly and cNFTs are skipped.
  "getAssetsByOwner",
  "getAssetProof",
]);

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_RPC_URL) {
    return new NextResponse("Not found", { status: 404 });
  }
  const body: unknown = await req.json();
  const calls = Array.isArray(body) ? body : [body];
  for (const c of calls) {
    const method = typeof c === "object" && c !== null ? (c as { method?: unknown }).method : undefined;
    if (typeof method !== "string" || !ALLOWED.has(method)) {
      return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32601, message: "Method not allowed by dev proxy" } }, { status: 400 });
    }
  }
  const res = await fetch(UPSTREAM, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return new NextResponse(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
}
