import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FEE_PERCENT_LABEL } from "@/lib/config";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";

export const metadata: Metadata = pageMetadata({
  title: "SolCleanup — Close empty Solana token accounts and reclaim SOL rent",
  absoluteTitle: true,
  description:
    "Close the empty token accounts in your Solana wallet and get back the SOL rent each one holds. Non-custodial, simulated before you sign, fee shown up front.",
  path: "/",
});

const APP_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE_URL,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Finds the empty token accounts in a Solana wallet and closes them so the rent they hold returns to the wallet. Non-custodial: transactions are built in the browser and signed by your own wallet.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: `No upfront cost. A ${FEE_PERCENT_LABEL} service fee is taken from the SOL rent reclaimed, inside the same transaction.`,
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

/** Home: one message, one action. Each topic has its own page. */
export default function Home() {
  return (
    <>
      <JsonLd data={APP_JSON_LD} />
      <main id="main">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
