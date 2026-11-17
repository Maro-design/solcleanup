/**
 * Record a referred claim for the referrer's stats.
 *   POST { signature, code }
 *
 * Nothing is trusted from the client except the signature: the server reads
 * the confirmed transaction from the chain and records only if it succeeded
 * and contains a transfer to the service fee wallet and one to the
 * referrer's wallet. The claimer's wallet is not stored.
 */
import { NextResponse } from "next/server";
import { Connection, type ParsedInstruction, type PartiallyDecodedInstruction } from "@solana/web3.js";
import { db, serverRpcUrl } from "@/lib/server/db";
import { LIMITS, rateLimit } from "@/lib/server/rateLimit";
import { FEE_WALLET, REFERRAL_CODE_RE } from "@/lib/config";

const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{64,100}$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Ix = ParsedInstruction | PartiallyDecodedInstruction;
function transfers(ixs: Ix[]): { to: string; lamports: number }[] {
  return ixs.flatMap((ix) => {
    if (!("parsed" in ix) || ix.program !== "system") return [];
    const p = ix.parsed as { type?: string; info?: { destination?: string; lamports?: number } };
    if (p.type !== "transfer" || !p.info?.destination || typeof p.info.lamports !== "number") return [];
    return [{ to: p.info.destination, lamports: p.info.lamports }];
  });
}

export async function POST(req: Request) {
  const limited = await rateLimit(req, LIMITS.claims);
  if (limited) return limited;
  const client = db();
  if (!client) return NextResponse.json({ error: "Referrals aren't set up on this server yet" }, { status: 503 });

  const body: unknown = await req.json().catch(() => null);
  const { signature, code } = (typeof body === "object" && body !== null ? body : {}) as { signature?: unknown; code?: unknown };
  if (typeof signature !== "string" || !SIG_RE.test(signature)) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  if (typeof code !== "string" || !REFERRAL_CODE_RE.test(code)) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const ref = await client.from("referrers").select("wallet").eq("code", code).maybeSingle();
  if (!ref.data) return NextResponse.json({ error: "Unknown code" }, { status: 404 });
  const referrerWallet: string = ref.data.wallet;

  // The transaction may take a moment to be visible to this RPC.
  const connection = new Connection(serverRpcUrl(), "confirmed");
  let tx = null;
  for (let i = 0; i < 5 && !tx; i++) {
    tx = await connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).catch(() => null);
    if (!tx) await sleep(1500);
  }
  if (!tx) return NextResponse.json({ error: "Transaction not found yet" }, { status: 404 });
  if (tx.meta?.err) return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 422 });

  const sent = transfers(tx.transaction.message.instructions as Ix[]);
  const fee = sent.filter((t) => t.to === FEE_WALLET).reduce((s, t) => s + t.lamports, 0);
  const referral = sent.filter((t) => t.to === referrerWallet).reduce((s, t) => s + t.lamports, 0);
  if (fee <= 0 || referral <= 0) return NextResponse.json({ error: "Not a referred SolCleanup claim" }, { status: 422 });

  const { error } = await client
    .from("referral_claims")
    .upsert({ signature, code, fee_lamports: fee + referral, referral_lamports: referral }, { onConflict: "signature", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: "Couldn't record the claim" }, { status: 500 });
  return NextResponse.json({ ok: true, referralLamports: referral });
}
