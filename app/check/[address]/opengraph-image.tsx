/**
 * Preview image for a shared wallet check: the real numbers in big type.
 * Any failure (bad address, rate limit, slow scan) falls back to the generic
 * site image instead of erroring.
 */
import { ImageResponse } from "next/og";
import { parseAddress } from "@/lib/scan";
import { formatSol, plural, shortAddress } from "@/lib/format";
import { OG, OG_SIZE, OgFrame, OgPoints, domainOf, fontOptions, genericOgImage } from "@/lib/og";
import { SITE_URL } from "@/lib/site";
import { checkForImage } from "@/lib/server/checkScan";

export const alt = "SOL rent locked in a Solana wallet's empty token accounts, checked with SolCleanup";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const domain = domainOf(SITE_URL);
  try {
    const { address } = await params;
    const key = parseAddress(decodeURIComponent(address));
    if (!key) return genericOgImage(domain);
    const r = await checkForImage(key.toBase58());
    if (!r.ok) return genericOgImage(domain);
    const t = r.summary.totals;
    const short = shortAddress(key.toBase58(), 4);
    if (t.closable === 0) return genericOgImage(domain, ["Nothing to reclaim", `in ${short} right now`]);

    return new ImageResponse(
      (
        <OgFrame domain={domain} footer={<OgPoints items={["Read-only check", "Non-custodial", "Check yours free"]} />}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: OG.meta, fontFamily: "Geist Mono" }}>{short}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 14 }}>
              <div style={{ display: "flex", fontSize: 132, fontFamily: "Geist Mono", color: OG.accentInk, letterSpacing: "-0.04em", lineHeight: 1 }}>
                {formatSol(t.reclaimableLamports)}
              </div>
              <div style={{ display: "flex", fontSize: 52, color: OG.accent }}>SOL</div>
            </div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 52, fontWeight: 600, letterSpacing: "-0.03em" }}>
              locked in {plural(t.closable, "empty account")}
            </div>
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE, ...(await fontOptions()) },
    );
  } catch {
    return genericOgImage(domain);
  }
}
