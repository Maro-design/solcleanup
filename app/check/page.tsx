import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/site/PageShell";
import { AddressCheck } from "@/components/landing/AddressCheck";

export const metadata: Metadata = pageMetadata({
  title: "How much SOL is locked in your wallet? Check any address",
  description:
    "Paste any Solana address to see how much SOL rent is locked in its empty token accounts. Free and read-only: nothing to connect and nothing to sign.",
  path: "/check",
});

export default function CheckPage() {
  return (
    <PageShell>
      <AddressCheck />
    </PageShell>
  );
}
