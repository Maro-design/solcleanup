import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { AddressCheck } from "@/components/landing/AddressCheck";

export const metadata: Metadata = { title: "Scan a wallet — SolCleanup" };

export default function CheckPage() {
  return (
    <PageShell>
      <AddressCheck />
    </PageShell>
  );
}
