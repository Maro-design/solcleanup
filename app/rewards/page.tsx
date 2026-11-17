import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { RewardsView } from "@/components/rewards/RewardsView";

export const metadata: Metadata = { title: "Rewards — SolCleanup" };

export default function RewardsPage() {
  return (
    <PageShell>
      <RewardsView />
    </PageShell>
  );
}
