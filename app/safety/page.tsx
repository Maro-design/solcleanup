import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/site/PageShell";
import { Safety } from "@/components/landing/Safety";
import { ClosingCta } from "@/components/landing/ClosingCta";

export const metadata: Metadata = pageMetadata({
  title: "Is it safe to close Solana token accounts?",
  description:
    "What SolCleanup closes, what it never touches, and how each transaction is re-checked and simulated before your wallet asks you to sign. Keys never leave you.",
  path: "/safety",
  ownImage: true,
});

export default function SafetyPage() {
  return (
    <PageShell>
      <Safety />
      <ClosingCta />
    </PageShell>
  );
}
