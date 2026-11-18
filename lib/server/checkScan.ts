/**
 * Server-side wallet check for the shareable /check/[address] pages and their
 * preview images. Aggregates only (see lib/checkSummary).
 *
 *  - Cached per address for 5 minutes, so repeat loads and link unfurls don't
 *    touch the RPC.
 *  - Rate limited per IP, counted only when a real scan runs (cache misses).
 *  - Time-boxed: very large wallets fall back to the in-browser scan rather
 *    than holding a serverless function open.
 *  - Nothing is stored beyond the 5-minute cache of the aggregate numbers.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { cache } from "react";
import { scanWallet } from "@/lib/scan";
import { summarize, type CheckSummary } from "@/lib/checkSummary";
import { serverRpcUrl } from "./db";
import { LIMITS, rateLimit, type Limit } from "./rateLimit";

export type CheckOutcome = { ok: true; summary: CheckSummary } | { ok: false; reason: "limited" | "timeout" | "error" };

export const CHECK_REVALIDATE_SECONDS = 300;

class Timeout extends Error {}
class Limited extends Error {}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Timeout("Scan took too long")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** A Request carrying the caller's IP, for the shared rate limiter. */
async function callerRequest(): Promise<Request> {
  const h = await headers();
  const ip =
    h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return new Request("https://check.internal/", { headers: { "x-forwarded-for": ip } });
}

async function checkWallet(address: string, limit: Limit, budgetMs: number): Promise<CheckOutcome> {
  let owner: PublicKey;
  try {
    owner = new PublicKey(address);
  } catch {
    return { ok: false, reason: "error" };
  }
  const req = await callerRequest();
  const cached = unstable_cache(
    async (): Promise<CheckSummary | { tooBig: true }> => {
      if (await rateLimit(req, limit)) throw new Limited();
      try {
        const result = await withTimeout(scanWallet(new Connection(serverRpcUrl(), "confirmed"), owner), budgetMs);
        return summarize(result);
      } catch (e) {
        // Remember that this wallet is too large to scan here; the browser scans it instead.
        if (e instanceof Timeout) return { tooBig: true };
        throw e;
      }
    },
    ["check-summary-v2", owner.toBase58()],
    { revalidate: CHECK_REVALIDATE_SECONDS },
  );
  try {
    const r = await cached();
    return "tooBig" in r ? { ok: false, reason: "timeout" } : { ok: true, summary: r };
  } catch (e) {
    return { ok: false, reason: e instanceof Limited ? "limited" : e instanceof Timeout ? "timeout" : "error" };
  }
}

/** For the page and its metadata: deduplicated within one request. */
export const checkForPage = cache((address: string) => checkWallet(address, LIMITS.checkPage, 7_000));

/** For the preview image (fetched separately by link unfurlers). */
export const checkForImage = (address: string) => checkWallet(address, LIMITS.checkImage, 6_000);
