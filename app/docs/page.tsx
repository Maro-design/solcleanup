import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { Footer } from "@/components/site/Footer";
import { DocsView } from "@/components/docs/DocsView";

export const metadata: Metadata = pageMetadata({
  title: "Solana token account rent, explained",
  description:
    "How Solana token account rent works, and exactly what SolCleanup reads, builds and charges: account rules, batching, fees, network costs and privacy.",
  path: "/docs",
});

export default function Docs() {
  return (
    <>
      <DocsView />
      <Footer />
    </>
  );
}
