/**
 * Shareable wallet check: /check/<address>. Scanned on the server (cached,
 * rate limited, time-boxed) and rendered as aggregate numbers only. Never
 * indexed: search engines shouldn't list wallet addresses, but the link still
 * previews when shared.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { AddressCheck } from "@/components/landing/AddressCheck";
import { parseAddress } from "@/lib/scan";
import { formatSol, plural, shortAddress } from "@/lib/format";
import { checkForPage } from "@/lib/server/checkScan";

type Props = { params: Promise<{ address: string }> };

/** The canonical base58 form, or null if this isn't a wallet address. */
async function addressFrom(params: Props["params"]): Promise<string | null> {
  const { address } = await params;
  const key = parseAddress(decodeURIComponent(address));
  return key ? key.toBase58() : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const address = await addressFrom(params);
  if (!address) notFound();
  const r = await checkForPage(address);
  const short = shortAddress(address, 4);
  const t = r.ok ? r.summary.totals : null;
  const title = t && t.closable > 0 ? `${formatSol(t.reclaimableLamports)} SOL locked in ${plural(t.closable, "empty account")}` : `Wallet check for ${short}`;
  const description =
    t && t.closable > 0
      ? `Wallet ${short} has ${plural(t.closable, "empty token account")} holding ${formatSol(t.reclaimableLamports)} SOL of rent. Check yours for free; it's read-only.`
      : `See how much SOL rent is locked in empty token accounts in wallet ${short}. Read-only: nothing to connect, nothing to sign.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/check/${address}` },
    openGraph: { title, description, url: `/check/${address}`, type: "website", siteName: "SolCleanup" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CheckAddressPage({ params }: Props) {
  const address = await addressFrom(params);
  if (!address) notFound();
  const r = await checkForPage(address);
  return (
    <PageShell>
      <AddressCheck address={address} initial={r.ok ? r.summary : null} />
    </PageShell>
  );
}
