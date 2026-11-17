import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { PortfolioView } from "@/components/portfolio/PortfolioView";

export const metadata: Metadata = { title: "Portfolio — SolCleanup" };

export default function PortfolioPage() {
  return (
    <PageShell>
      <PortfolioView />
    </PageShell>
  );
}
