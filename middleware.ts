/**
 * Only for /check/<address>: a malformed address gets a real 404 status before
 * the page starts streaming (once streaming starts, the status is fixed at 200).
 * The page validates again with PublicKey.
 */
import { NextResponse, type NextRequest } from "next/server";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** True when `s` is base58 that decodes to exactly 32 bytes (a Solana public key). */
function isPublicKey(s: string): boolean {
  if (s.length < 32 || s.length > 44) return false;
  const bytes: number[] = [];
  for (const ch of s) {
    let carry = ALPHABET.indexOf(ch);
    if (carry < 0) return false;
    for (let i = 0; i < bytes.length; i++) {
      carry += (bytes[i] as number) * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (s[zeros] === "1") zeros++;
  return bytes.length + zeros === 32;
}

export function middleware(req: NextRequest) {
  const segment = req.nextUrl.pathname.split("/")[2] ?? "";
  if (segment === "" || isPublicKey(decodeURIComponent(segment))) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 });
}

export const config = { matcher: ["/check/:address"] };
