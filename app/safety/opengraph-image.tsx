import { genericOgImage, domainOf, OG_SIZE } from "@/lib/og";
import { SITE_URL } from "@/lib/site";

export const alt = "SolCleanup safety rules: only empty accounts are closed by default, keys never leave your wallet";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return genericOgImage(domainOf(SITE_URL), ["Only empty accounts.", "Keys never leave your wallet."]);
}
