import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { AppGate } from "./AppGate";

export const metadata: Metadata = pageMetadata({
  title: "Dashboard",
  description: "Your token accounts, ready to review and close. Connect a Solana wallet to see the accounts it holds and the SOL rent you can reclaim from them.",
  path: "/app",
  noindex: true,
});

export default function AppPage() {
  return (
    <>
      <main id="main" className="mx-auto min-h-dvh max-w-[1200px] px-6 pb-48 pt-16">
        <AppGate />
      </main>
    </>
  );
}
