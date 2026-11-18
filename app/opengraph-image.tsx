/** Site-wide link preview (Discord, X, Telegram, iMessage…), generated at build time. */
import { genericOgImage, domainOf, OG_SIZE } from "@/lib/og";
import { SITE_URL } from "@/lib/site";

export const alt = "SolCleanup — reclaim the SOL locked in empty token accounts";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return genericOgImage(domainOf(SITE_URL));
}
