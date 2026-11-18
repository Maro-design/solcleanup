/**
 * The canonical site origin, from NEXT_PUBLIC_SITE_URL (no trailing slash).
 * A production build without it fails loudly: every canonical URL, sitemap
 * entry and link preview depends on it.
 */
const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (!raw && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_SITE_URL is not set. Set it to the live origin (e.g. https://solcleanup.xyz, no trailing slash) in .env.local or your host's environment variables. See .env.example.",
  );
}

export const SITE_URL = (raw || "http://localhost:3210").replace(/\/+$/, "");
export const SITE_NAME = "SolCleanup";

/** Absolute URL for a path on this site. */
export const absoluteUrl = (path = "/") => `${SITE_URL}${path === "/" ? "" : path}`;
