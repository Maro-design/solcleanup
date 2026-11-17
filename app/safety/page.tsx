import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { Safety } from "@/components/landing/Safety";
import { ClosingCta } from "@/components/landing/ClosingCta";

export const metadata: Metadata = { title: "Safety — SolCleanup" };

export default function SafetyPage() {
  return (
    <PageShell>
      <Safety />
      <ClosingCta />
    </PageShell>
  );
}
