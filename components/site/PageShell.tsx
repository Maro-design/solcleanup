import type { ReactNode } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

/** Shared frame for content pages: nav, one section rhythm, footer. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main" className="flex min-h-[80svh] flex-col gap-24 pb-24 pt-32 md:gap-32 md:pb-32 md:pt-40">
        {children}
      </main>
      <Footer />
    </>
  );
}
