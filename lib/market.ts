/**
 * Read-only market data from Jupiter: USD prices and token metadata.
 * Only public mint addresses are sent — never the wallet address.
 * Every function degrades gracefully: on failure it returns what it has.
 */
import { JUPITER_PRICE_URL, JUPITER_TOKENS_URL, WSOL_MINT } from "./config";

export interface TokenMeta {
  symbol: string;
  name: string;
  logo: string | null;
}

const PRICE_CHUNK = 50;
const TOKEN_CHUNK = 100;
const TIMEOUT_MS = 8000;

const CONCURRENCY = 3;
const RETRIES = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET JSON with a timeout and a short backoff on 429 / 5xx. */
async function fetchJson(url: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
      if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Run async tasks with bounded concurrency (public APIs rate-limit bursts). */
async function runLimited<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Pull a USD price out of either the v3 (`usdPrice`) or legacy v2 (`price`) shape. */
function readPrice(entry: unknown): number | null {
  if (!isRecord(entry)) return null;
  const raw = entry.usdPrice ?? entry.price;
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * USD prices for the given mints. Mints without a price are absent from the map.
 */
export async function fetchPrices(mints: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const unique = [...new Set(mints)];
  await runLimited(chunk(unique, PRICE_CHUNK), async (ids) => {
      try {
        const body = await fetchJson(`${JUPITER_PRICE_URL}?ids=${ids.join(",")}`);
        // v3 returns { [mint]: {...} }, v2 returned { data: { [mint]: {...} } }
        const map = isRecord(body) && isRecord(body.data) ? body.data : body;
        if (!isRecord(map)) return;
        for (const id of ids) {
          const p = readPrice(map[id]);
          if (p !== null) prices.set(id, p);
        }
      } catch {
        // Price unavailable — callers treat missing prices conservatively.
      }
  });
  return prices;
}

export async function fetchSolPrice(): Promise<number | null> {
  const map = await fetchPrices([WSOL_MINT]);
  return map.get(WSOL_MINT) ?? null;
}

/** Symbol, name and logo for the given mints. */
export async function fetchTokenMeta(mints: string[]): Promise<Map<string, TokenMeta>> {
  const meta = new Map<string, TokenMeta>();
  const unique = [...new Set(mints)];
  await runLimited(chunk(unique, TOKEN_CHUNK), async (ids) => {
      try {
        const body = await fetchJson(`${JUPITER_TOKENS_URL}?query=${ids.join(",")}`);
        if (!Array.isArray(body)) return;
        for (const t of body) {
          if (!isRecord(t) || typeof t.id !== "string") continue;
          meta.set(t.id, {
            symbol: typeof t.symbol === "string" ? t.symbol : "",
            name: typeof t.name === "string" ? t.name : "",
            logo: typeof t.icon === "string" && t.icon.startsWith("https://") ? t.icon : null,
          });
        }
      } catch {
        // Metadata is cosmetic; the table falls back to the mint address.
      }
  });
  return meta;
}
