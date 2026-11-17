import type { Metadata } from "next";
import { Nav } from "@/components/site/Nav";
import { AppGate } from "./AppGate";

export const metadata: Metadata = { title: "Dashboard — SolCleanup" };

export default function AppPage() {
  return (
    <>
      <Nav />
      <main id="main" className="mx-auto min-h-dvh max-w-[1200px] px-6 pb-48 pt-16">
        <AppGate />
      </main>
    </>
  );
}
