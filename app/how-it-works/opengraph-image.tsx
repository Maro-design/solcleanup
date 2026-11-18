import { genericOgImage, domainOf, OG_SIZE } from "@/lib/og";
import { SITE_URL } from "@/lib/site";

export const alt = "How SolCleanup closes empty Solana token accounts: scan, review, sign once";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericOgImage(domainOf(SITE_URL), ["Scan, review, sign once.", "Your rent comes back."]);
}
