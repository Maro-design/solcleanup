/**
 * A wallet's SolCleanup history, read from the chain (nothing is stored).
 *   GET ?wallet=<addr>  →  { claims: PortfolioClaim[] }
 *
 * Every SolCleanup claim touches the service fee wallet, so a wallet's claims
 * are the signatures that appear in BOTH the wallet's history and the fee
 * wallet's history. Signature lists are cheap (1000 per call); only the
 * matching transactions are loaded and parsed.
 */
import { NextResponse } from "next/server";
import {
  type ConfirmedSignatureInfo,
  Connection,
  PublicKey,
  type ParsedInstruction,
  type ParsedTransactionWithMeta,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";
import { serverRpcUrl } from "@/lib/server/db";
import { LIMITS, rateLimit } from "@/lib/server/rateLimit";
import { FEE_WALLET } from "@/lib/config";
import { TOKEN_METADATA_PROGRAM_ID } from "@/lib/nft";
import { BUBBLEGUM_PROGRAM_ID } from "@/lib/cnft";

export interface PortfolioClaim {
  signature: string;
  /** Unix seconds. */
  time: number;
  /** Net SOL change for the wallet in lamports (rent back, minus fees). */
  receivedLamports: number;
  closed: number;
  burned: number;
}

const PAGE = 1000;
const MAX_WALLET_PAGES = 10;
const CONCURRENCY = 4;
const WALLET_CACHE_MS = 60_000;
const FEE_REFRESH_MS = 15_000;

type Ix = ParsedInstruction | PartiallyDecodedInstruction;

const connection = () => new Connection(serverRpcUrl(), "confirmed");

/* ---------- fee wallet index (all SolCleanup claims), refreshed incrementally ---------- */

const feeIndex = { sigs: new Set<string>(), newest: null as string | null, oldestTime: Number.POSITIVE_INFINITY, at: 0 };

async function refreshFeeIndex(c: Connection) {
  if (Date.now() - feeIndex.at < FEE_REFRESH_MS && feeIndex.newest) return;
  const fee = new PublicKey(FEE_WALLET);
  let before: string | undefined;
  for (;;) {
    const page: ConfirmedSignatureInfo[] = await c.getSignaturesForAddress(fee, { limit: PAGE, before, until: feeIndex.newest ?? undefined }, "confirmed");
    if (page.length === 0) break;
    for (const s of page) {
      feeIndex.sigs.add(s.signature);
      if (s.blockTime) feeIndex.oldestTime = Math.min(feeIndex.oldestTime, s.blockTime);
    }
    if (before === undefined) feeIndex.newest = page[0]?.signature ?? feeIndex.newest;
    if (page.length < PAGE) break;
    before = page[page.length - 1]?.signature;
  }
  feeIndex.at = Date.now();
}

/* ---------- one transaction → one claim ---------- */

function readClaim(wallet: string, sig: string, tx: ParsedTransactionWithMeta | null): PortfolioClaim | null {
  if (!tx || !tx.meta || tx.meta.err || !tx.blockTime) return null;
  if (tx.transaction.message.accountKeys[0]?.pubkey.toBase58() !== wallet) return null; // the wallet paid for it
  let paidFee = false;
  let closed = 0;
  let burned = 0;
  for (const ix of tx.transaction.message.instructions as Ix[]) {
    if ("parsed" in ix) {
      const p = ix.parsed as { type?: string; info?: { destination?: string } };
      if (ix.program === "system" && p.type === "transfer" && p.info?.destination === FEE_WALLET) paidFee = true;
      if (ix.program === "spl-token" && p.type === "closeAccount") closed++;
      if (ix.program === "spl-token" && (p.type === "burn" || p.type === "burnChecked")) burned++;
    } else if (ix.programId.equals(TOKEN_METADATA_PROGRAM_ID)) {
      closed++; // BurnV1 closes the token account too
      burned++;
    } else if (ix.programId.equals(BUBBLEGUM_PROGRAM_ID)) {
      burned++;
    }
  }
  if (!paidFee && closed + burned === 0) return null;
  const pre = tx.meta.preBalances[0] ?? 0;
  const post = tx.meta.postBalances[0] ?? 0;
  return { signature: sig, time: tx.blockTime, receivedLamports: post - pre, closed, burned };
}

const walletCache = new Map<string, { at: number; claims: PortfolioClaim[] }>();

export async function GET(req: Request) {
  const limited = await rateLimit(req, LIMITS.portfolio);
  if (limited) return limited;
  const raw = new URL(req.url).searchParams.get("wallet") ?? "";
  let wallet: PublicKey;
  try {
    wallet = new PublicKey(raw);
  } catch {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }
  const key = wallet.toBase58();
  const hit = walletCache.get(key);
  if (hit && Date.now() - hit.at < WALLET_CACHE_MS) return NextResponse.json({ claims: hit.claims });

  const c = connection();
  try {
    await refreshFeeIndex(c);
    if (feeIndex.sigs.size === 0) return NextResponse.json({ claims: [] });

    // Walk the wallet's history back to the fee wallet's first transaction; nothing older can be a claim.
    const matches: string[] = [];
    let before: string | undefined;
    for (let pageNo = 0; pageNo < MAX_WALLET_PAGES; pageNo++) {
      const page = await c.getSignaturesForAddress(wallet, { limit: PAGE, before }, "confirmed");
      for (const s of page) if (!s.err && feeIndex.sigs.has(s.signature)) matches.push(s.signature);
      const last = page[page.length - 1];
      if (page.length < PAGE || !last || (last.blockTime ?? 0) < feeIndex.oldestTime) break;
      before = last.signature;
    }

    const claims: PortfolioClaim[] = [];
    let next = 0;
    const worker = async () => {
      while (next < matches.length) {
        const sig = matches[next++];
        if (!sig) continue;
        const tx = await c.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null);
        const claim = readClaim(key, sig, tx);
        if (claim) claims.push(claim);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    claims.sort((a, b) => b.time - a.time);
    walletCache.set(key, { at: Date.now(), claims });
    return NextResponse.json({ claims });
  } catch (e) {
    console.error("[portfolio]", e);
    return NextResponse.json({ error: "Couldn't read this wallet's history right now" }, { status: 502 });
  }
}
