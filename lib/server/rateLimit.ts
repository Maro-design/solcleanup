/**
 * Per-IP rate limits for API routes. Counters live in Supabase so limits hold
 * across every server instance; keys are hashed so raw IPs are never stored.
 * If the database is unreachable, a small in-memory limiter takes over
 * (per instance), so a database outage never opens the gates entirely.
 */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";

export interface Limit {
  /** Route label, part of the key. */
  name: string;
  /** Max requests per window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
}

export const LIMITS = {
  portfolio: { name: "portfolio", max: 20, windowSec: 60 },
  referralRead: { name: "referral-read", max: 60, windowSec: 60 },
  referralCreate: { name: "referral-create", max: 5, windowSec: 600 },
  referralRename: { name: "referral-rename", max: 10, windowSec: 600 },
  claims: { name: "claims", max: 30, windowSec: 60 },
} satisfies Record<string, Limit>;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "unknown";
}

const SALT = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_URL ?? "solcleanup";
const keyFor = (req: Request, limit: Limit) =>
  createHash("sha256").update(`${SALT}|${limit.name}|${clientIp(req)}`).digest("hex").slice(0, 40);

/* In-memory fallback (per instance). */
const memory = new Map<string, { start: number; hits: number }>();
function memoryHit(key: string, limit: Limit): boolean {
  const now = Date.now();
  const cur = memory.get(key);
  if (!cur || now - cur.start > limit.windowSec * 1000) {
    memory.set(key, { start: now, hits: 1 });
    if (memory.size > 10_000) memory.clear();
    return true;
  }
  cur.hits += 1;
  return cur.hits <= limit.max;
}

/** Returns a 429 response when the caller is over the limit, otherwise null. */
export async function rateLimit(req: Request, limit: Limit): Promise<NextResponse | null> {
  const key = keyFor(req, limit);
  let allowed: boolean;
  const client = db();
  if (client) {
    const { data, error } = await client.rpc("hit_rate_limit", { p_key: key, p_limit: limit.max, p_window_seconds: limit.windowSec });
    allowed = error ? memoryHit(key, limit) : data === true;
  } else {
    allowed = memoryHit(key, limit);
  }
  if (allowed) return null;
  return NextResponse.json(
    { error: "Too many requests. Wait a minute and try again" },
    { status: 429, headers: { "retry-after": String(limit.windowSec) } },
  );
}
