import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Faq } from "@/components/landing/Faq";
import { ClosingCta } from "@/components/landing/ClosingCta";

export const metadata: Metadata = { title: "FAQ — SolCleanup" };

export default function FaqPage() {
  return (
    <PageShell>
      <Faq />
      <ClosingCta />
    </PageShell>
  );
}
