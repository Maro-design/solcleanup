/**
 * One sweep of the wallet through the DAS API (getAssetsByOwner with
 * fungibles): token names, symbols and logos for every mint, the prices the
 * RPC already knows, and the raw compressed-NFT items. Pages run in parallel,
 * so a wallet with 10,000+ accounts takes seconds instead of minutes.
 *
 * Read-only, and the wallet address only goes to the RPC the app already
 * uses. Returns null when the RPC has no DAS API; callers fall back to Jupiter.
 */
import type { TokenMeta } from "./market";

const PAGE = 1000;
const MAX_PAGES = 40;
/** Free RPC plans allow ~2 DAS requests a second. */
const LANES = 2;
const PAGE_TIMEOUT_MS = 25_000;

export interface AssetSweep {
  meta: Map<string, TokenMeta>;
  /** USD price per whole token, where the RPC has one. */
  prices: Map<string, number>;
  /** Raw DAS items for compressed assets (parsed in cnft.ts); undefined if a page was missed. */
  compressed: unknown[] | undefined;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** One page, retried with backoff (free RPC plans rate-limit DAS hard). */
async function pageWithRetry(endpoint: string, owner: string, n: number): Promise<unknown[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await page(endpoint, owner, n);
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 700 * 2 ** attempt));
    }
  }
}

async function page(endpoint: string, owner: string, n: number): Promise<unknown[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "solcleanup",
        method: "getAssetsByOwner",
        params: { ownerAddress: owner, page: n, limit: PAGE, displayOptions: { showFungible: true } },
      }),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok || !isRecord(json) || "error" in json || !isRecord(json.result)) throw new Error("getAssetsByOwner is not available on this RPC");
    const items = json.result.items;
    return Array.isArray(items) ? items : [];
  } finally {
    clearTimeout(timer);
  }
}

/** `expected` is the number of token accounts already found; it sizes the first wave of pages. */
export async function sweepAssets(endpoint: string, owner: string, expected: number): Promise<AssetSweep | null> {
  let first: unknown[];
  try {
    first = await pageWithRetry(endpoint, owner, 1);
  } catch {
    return null;
  }
  const pages: unknown[][] = [first];
  let complete = true;
  if (first.length >= PAGE) {
    // Fetch pages 2..N in parallel until one comes back short.
    let next = 2;
    let done = false;
    const want = Math.min(MAX_PAGES, Math.max(2, Math.ceil((expected + 1) / PAGE) + 1));
    await Promise.all(
      Array.from({ length: Math.min(LANES, want - 1) }, async () => {
        while (!done && next <= MAX_PAGES) {
          const n = next++;
          try {
            const items = await pageWithRetry(endpoint, owner, n);
            pages[n - 1] = items;
            if (items.length < PAGE) done = true;
          } catch {
            // A missed page only costs names and prices; cNFTs are refetched on their own.
            complete = false;
          }
        }
      }),
    );
  }

  const meta = new Map<string, TokenMeta>();
  const prices = new Map<string, number>();
  const compressed: unknown[] = [];
  for (const items of pages) {
    for (const it of items ?? []) {
      if (!isRecord(it) || typeof it.id !== "string") continue;
      if (isRecord(it.compression) && it.compression.compressed === true) {
        compressed.push(it);
        continue;
      }
      const content = isRecord(it.content) ? it.content : {};
      const md = isRecord(content.metadata) ? content.metadata : {};
      const links = isRecord(content.links) ? content.links : {};
      const ti = isRecord(it.token_info) ? it.token_info : {};
      const symbol = typeof ti.symbol === "string" && ti.symbol ? ti.symbol : typeof md.symbol === "string" ? md.symbol : "";
      const name = typeof md.name === "string" ? md.name : "";
      const image = typeof links.image === "string" && links.image.startsWith("https://") ? links.image : null;
      if (symbol || name) meta.set(it.id, { symbol: symbol.trim(), name: name.trim(), logo: image });
      const pi = isRecord(ti.price_info) ? ti.price_info : null;
      const p = pi && pi.currency === "USDC" && typeof pi.price_per_token === "number" ? pi.price_per_token : NaN;
      if (Number.isFinite(p) && p > 0) prices.set(it.id, p);
    }
  }
  return { meta, prices, compressed: complete ? compressed : undefined };
}
