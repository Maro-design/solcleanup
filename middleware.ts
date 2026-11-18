/**
 * Only for /check/<address>: a malformed address gets a real 404 status before
 * the page starts streaming (once streaming starts, the status is fixed at 200).
 * Full validation (a 32-byte public key) still happens in the page.
 */
import { NextResponse, type NextRequest } from "next/server";

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function middleware(req: NextRequest) {
  const segment = req.nextUrl.pathname.split("/")[2] ?? "";
  if (segment === "" || BASE58_ADDRESS.test(decodeURIComponent(segment))) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_not-found", req.url), { status: 404 });
}

export const config = { matcher: ["/check/:address"] };
