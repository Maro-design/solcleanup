/**
 * Referral codes.
 *   GET  ?code=abc123     → { code, wallet }            (used before a claim to route the referrer's share)
 *   GET  ?wallet=<addr>   → { code, claims, earnedLamports } | { code: null }
 *   POST { wallet }       → { code }                    (creates the wallet's code once; idempotent)
 *
 * A code only ever pays the wallet it was created for, so creating one needs
 * no signature: registering someone else's wallet just sends them money.
 */
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { ed25519 } from "@noble/curves/ed25519";
import { db } from "@/lib/server/db";
import { LIMITS, rateLimit } from "@/lib/server/rateLimit";
import { REFERRAL_CODE_RE, referralCodeMessage } from "@/lib/config";

/** Codes nobody may claim, so no one can pose as the service. */
const RESERVED = new Set(["solcleanup", "sol-cleanup", "admin", "support", "official", "team", "help", "rewards", "referral"]);

const notConfigured = () => NextResponse.json({ error: "Referrals aren't set up on this server yet" }, { status: 503 });

function validWallet(w: unknown): string | null {
  if (typeof w !== "string" || w.length < 32 || w.length > 44) return null;
  try {
    return new PublicKey(w).toBase58();
  } catch {
    return null;
  }
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes (0/o, 1/l/i)
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function GET(req: Request) {
  const client = db();
  if (client) {
    const limited = await rateLimit(req, LIMITS.referralRead);
    if (limited) return limited;
  }
  if (!client) return notConfigured();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const wallet = url.searchParams.get("wallet");

  if (code !== null) {
    if (!REFERRAL_CODE_RE.test(code)) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    const { data, error } = await client.from("referrers").select("code, wallet").eq("code", code).maybeSingle();
    if (error) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Unknown code" }, { status: 404 });
    return NextResponse.json(data, { headers: { "cache-control": "public, max-age=300" } });
  }

  const w = validWallet(wallet);
  if (!w) return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  const { data, error } = await client.from("referrers").select("code").eq("wallet", w).maybeSingle();
  if (error) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ code: null });
  const stats = await client.rpc("referral_stats", { p_code: data.code });
  const row = Array.isArray(stats.data) ? (stats.data[0] as { claims: number; earned_lamports: number } | undefined) : undefined;
  return NextResponse.json({ code: data.code, claims: Number(row?.claims ?? 0), earnedLamports: Number(row?.earned_lamports ?? 0) });
}

export async function POST(req: Request) {
  const client = db();
  if (!client) return notConfigured();
  const limited = await rateLimit(req, LIMITS.referralCreate);
  if (limited) return limited;
  const body: unknown = await req.json().catch(() => null);
  const w = validWallet(typeof body === "object" && body !== null ? (body as { wallet?: unknown }).wallet : null);
  if (!w) return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });

  const existing = await client.from("referrers").select("code").eq("wallet", w).maybeSingle();
  if (existing.data) return NextResponse.json({ code: existing.data.code });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { error } = await client.from("referrers").insert({ code, wallet: w });
    if (!error) return NextResponse.json({ code }, { status: 201 });
    // 23505 = unique violation: either the code collided (retry) or the wallet raced in (return it).
    if (error.code !== "23505") return NextResponse.json({ error: "Couldn't create a code" }, { status: 500 });
    const again = await client.from("referrers").select("code").eq("wallet", w).maybeSingle();
    if (again.data) return NextResponse.json({ code: again.data.code });
  }
  return NextResponse.json({ error: "Couldn't create a code" }, { status: 500 });
}

/**
 * Choose your own code.
 *   PUT { domain, wallet, code, issuedAt, signature }   signature = base64 ed25519 over referralCodeMessage()
 * The signature proves the caller owns the wallet, so nobody can rename
 * someone else's code (which would break their shared links).
 */
export async function PUT(req: Request) {
  const client = db();
  if (!client) return notConfigured();
  const limited = await rateLimit(req, LIMITS.referralRename);
  if (limited) return limited;
  const body = (await req.json().catch(() => null)) as { domain?: unknown; wallet?: unknown; code?: unknown; issuedAt?: unknown; signature?: unknown } | null;
  // The signed message must name this site, as seen by the server.
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0]?.trim() ?? "";
  if (typeof body?.domain !== "string" || !host || body.domain !== host) {
    return NextResponse.json({ error: "This signature was made for a different website" }, { status: 401 });
  }
  const domain = body.domain;
  const w = validWallet(body?.wallet);
  const code = typeof body?.code === "string" ? body.code.trim().toLowerCase() : "";
  const issuedAt = typeof body?.issuedAt === "number" ? body.issuedAt : NaN;
  if (!w) return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  if (!REFERRAL_CODE_RE.test(code)) {
    return NextResponse.json({ error: "Use 3–16 characters: letters, numbers, - or _" }, { status: 400 });
  }
  if (RESERVED.has(code)) return NextResponse.json({ error: "That code is reserved" }, { status: 409 });
  if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 10 * 60 * 1000) {
    return NextResponse.json({ error: "Signature expired, try again" }, { status: 401 });
  }

  let ok = false;
  try {
    const sig = Buffer.from(String(body?.signature ?? ""), "base64");
    const msg = new TextEncoder().encode(referralCodeMessage(domain, w, code, issuedAt));
    ok = sig.length === 64 && ed25519.verify(sig, msg, new PublicKey(w).toBytes());
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "Signature doesn't match this wallet" }, { status: 401 });

  const taken = await client.from("referrers").select("wallet").eq("code", code).maybeSingle();
  if (taken.data && taken.data.wallet !== w) return NextResponse.json({ error: "That code is taken" }, { status: 409 });
  if (taken.data) return NextResponse.json({ code });

  const existing = await client.from("referrers").select("code").eq("wallet", w).maybeSingle();
  const { error } = existing.data
    ? await client.from("referrers").update({ code }).eq("wallet", w)
    : await client.from("referrers").insert({ code, wallet: w });
  if (error?.code === "23505") return NextResponse.json({ error: "That code is taken" }, { status: 409 });
  if (error) return NextResponse.json({ error: "Couldn't save your code" }, { status: 500 });
  return NextResponse.json({ code });
}
