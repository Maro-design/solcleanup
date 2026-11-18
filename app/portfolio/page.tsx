import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/site/PageShell";
import { PortfolioView } from "@/components/portfolio/PortfolioView";

export const metadata: Metadata = pageMetadata({
  title: "Portfolio",
  description: "Every claim your wallet has made through SolCleanup: SOL reclaimed over time, accounts closed, and a link to each of those transactions on Solscan.",
  path: "/portfolio",
  noindex: true,
});

export default function PortfolioPage() {
  return (
    <PageShell>
      <PortfolioView />
    </PageShell>
  );
}
