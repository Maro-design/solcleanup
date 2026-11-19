/**
 * Read-only market data from Jupiter: USD prices and token metadata.
 * Only public mint addresses are sent — never the wallet address.
 * Every function degrades gracefully: on failure or when its time budget runs
 * out it returns what it has, and a missing price is always treated as unpriced.
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
/**
 * How long a scan waits on Jupiter before treating the rest as unpriced.
 * The free API allows about 5 requests per 10 seconds, so waiting longer buys
 * little: up to ~250 held tokens are priced at once; for bigger wallets the
 * rest stay unpriced (and therefore protected) instead of stalling the scan.
 */
const DEFAULT_BUDGET_MS = 6_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Jupiter's public API rate-limits bursts. All lanes share one cooldown, so a
 * 429 pauses every request instead of each lane hammering the API on its own.
 */
let cooldownUntil = 0;

/** GET JSON with a timeout. Retries on 429 / 5xx until `deadline`, then gives up. */
async function fetchJson(url: string, deadline: number): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const wait = cooldownUntil - Date.now();
    if (wait > 0) {
      if (Date.now() + wait >= deadline) throw new Error("Out of time");
      await sleep(wait);
    }
    const left = deadline - Date.now();
    if (left <= 0) throw new Error("Out of time");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(TIMEOUT_MS, left));
    try {
      const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) {
        // Wait exactly until the window resets when the API says when (server side);
        // browsers usually can't read that header, so fall back to Retry-After, then
        // to half the ~10 s window. If that runs past the deadline, the next loop gives up.
        const reset = Number(res.headers.get("x-ratelimit-reset"));
        const retryAfter = Number(res.headers.get("retry-after"));
        const pause =
          res.status === 429 && Number.isFinite(reset) && reset > 1e9
            ? Math.max(500, reset * 1000 - Date.now())
            : Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : res.status === 429
                ? 5_000
                : Math.min(4000, 800 * 2 ** Math.min(attempt, 3));
        cooldownUntil = Math.max(cooldownUntil, Date.now() + pause);
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
async function runLimited<T>(items: T[], worker: (item: T) => Promise<void>, deadline = Infinity): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length && Date.now() < deadline) {
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
export async function fetchPrices(mints: string[], budgetMs = DEFAULT_BUDGET_MS): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const unique = [...new Set(mints)];
  const deadline = Date.now() + budgetMs;
  await runLimited(chunk(unique, PRICE_CHUNK), async (ids) => {
      try {
        const body = await fetchJson(`${JUPITER_PRICE_URL}?ids=${ids.join(",")}`, deadline);
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
  }, deadline);
  return prices;
}

export async function fetchSolPrice(): Promise<number | null> {
  const map = await fetchPrices([WSOL_MINT]);
  return map.get(WSOL_MINT) ?? null;
}

/** Symbol, name and logo for the given mints. */
export async function fetchTokenMeta(mints: string[], budgetMs = DEFAULT_BUDGET_MS): Promise<Map<string, TokenMeta>> {
  const meta = new Map<string, TokenMeta>();
  const unique = [...new Set(mints)];
  const deadline = Date.now() + budgetMs;
  await runLimited(chunk(unique, TOKEN_CHUNK), async (ids) => {
      try {
        const body = await fetchJson(`${JUPITER_TOKENS_URL}?query=${ids.join(",")}`, deadline);
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
  }, deadline);
  return meta;
}
