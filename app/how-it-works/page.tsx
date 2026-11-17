import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ClosingCta } from "@/components/landing/ClosingCta";

export const metadata: Metadata = { title: "How it works — SolCleanup" };

export default function HowItWorksPage() {
  return (
    <PageShell>
      <HowItWorks />
      <ClosingCta />
    </PageShell>
  );
}
