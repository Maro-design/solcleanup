/**
 * Client side of referrals. A visit with ?ref=<code> remembers the code in
 * this browser for 30 days (first link wins). At claim time the code is
 * resolved to the referrer's wallet, which receives its share on-chain.
 */
import { REFERRAL_CODE_RE } from "./config";

const KEY = "solcleanup-ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Stored {
  code: string;
  at: number;
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    if (typeof v.code !== "string" || typeof v.at !== "number" || !REFERRAL_CODE_RE.test(v.code)) return null;
    if (Date.now() - v.at > TTL_MS) return null;
    return { code: v.code, at: v.at };
  } catch {
    return null;
  }
}

/** Save ?ref= from the current URL unless a fresh code is already stored. */
export function captureReferral(): void {
  try {
    const code = new URLSearchParams(window.location.search).get("ref")?.toLowerCase();
    if (!code || !REFERRAL_CODE_RE.test(code) || read()) return;
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    /* storage blocked: referral just isn't remembered */
  }
}

export const storedReferralCode = (): string | null => read()?.code ?? null;

/** The wallet behind a code, or null if unknown or the server isn't configured. */
export async function resolveReferrer(code: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/referral?code=${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { wallet?: unknown };
    return typeof data.wallet === "string" ? data.wallet : null;
  } catch {
    return null;
  }
}

/** Tell the server about successful referred claims. Best effort; the server verifies each on-chain. */
export function reportReferredClaims(signatures: string[], code: string): void {
  for (const signature of signatures) {
    void fetch("/api/claims", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ signature, code }),
      keepalive: true,
    }).catch(() => undefined);
  }
}
