import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { PageShell } from "@/components/site/PageShell";
import { RewardsView } from "@/components/rewards/RewardsView";

export const metadata: Metadata = pageMetadata({
  title: "Rewards",
  description: "Your SolCleanup referral link and code, and the SOL you've earned from claims made by people you invited, paid on-chain in the same transaction.",
  path: "/rewards",
  noindex: true,
});

export default function RewardsPage() {
  return (
    <PageShell>
      <RewardsView />
    </PageShell>
  );
}
