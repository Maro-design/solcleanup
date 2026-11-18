import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { HOW_STEPS } from "@/lib/content/howItWorks";
import { SITE_URL } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { FEE_PERCENT_LABEL } from "@/lib/config";
import { PageShell } from "@/components/site/PageShell";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ClosingCta } from "@/components/landing/ClosingCta";

export const metadata: Metadata = pageMetadata({
  title: "How to close a Solana token account and get your SOL back",
  description: `Scan, review, sign once: how SolCleanup closes empty Solana token accounts and returns their rent, with the ${FEE_PERCENT_LABEL} fee paid in the same transaction.`,
  path: "/how-it-works",
  ownImage: true,
});

const HOWTO_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to close empty Solana token accounts and get the rent back",
  description: "Scan a wallet, review exactly what you get, then approve once. The rent from each closed account returns to your wallet.",
  tool: [{ "@type": "HowToTool", name: "A Solana wallet such as Phantom, Solflare or Backpack" }],
  step: HOW_STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.text,
    url: `${SITE_URL}/how-it-works#how`,
  })),
};

export default function HowItWorksPage() {
  return (
    <PageShell>
      <JsonLd data={HOWTO_JSON_LD} />
      <HowItWorks />
      <ClosingCta />
    </PageShell>
  );
}
