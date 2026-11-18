import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { FAQ_ITEMS } from "@/lib/content/faq";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageShell } from "@/components/site/PageShell";
import { Faq } from "@/components/landing/Faq";
import { ClosingCta } from "@/components/landing/ClosingCta";

export const metadata: Metadata = pageMetadata({
  title: "Solana rent reclaim questions, answered",
  description:
    "How much SOL an empty token account holds, how the fee is charged, what happens if a transaction fails and which wallets work. Plain answers on reclaiming rent.",
  path: "/faq",
});

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((i) => ({
    "@type": "Question",
    name: i.q,
    acceptedAnswer: { "@type": "Answer", text: i.a },
  })),
};

export default function FaqPage() {
  return (
    <PageShell>
      <JsonLd data={FAQ_JSON_LD} />
      <Faq />
      <ClosingCta />
    </PageShell>
  );
}
