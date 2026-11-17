import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { DocsView } from "@/components/docs/DocsView";

export const metadata: Metadata = { title: "Docs — SolCleanup" };

export default function Docs() {
  return (
    <>
      <Nav />
      <DocsView />
      <Footer />
    </>
  );
}
