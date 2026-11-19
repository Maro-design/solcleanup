import type { ReactNode } from "react";
import { Footer } from "@/components/site/Footer";

/** Shared frame for content pages: one section rhythm and the footer. The nav lives in the root layout. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main id="main" className="flex min-h-[80svh] flex-col gap-24 pb-24 pt-32 md:gap-32 md:pb-32 md:pt-40">
        {children}
      </main>
      <Footer />
    </>
  );
}
