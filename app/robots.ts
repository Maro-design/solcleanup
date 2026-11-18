import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Public pages are crawlable; per-wallet dashboards and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/portfolio", "/rewards", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
