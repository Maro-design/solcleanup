import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-[1200px] px-6">
        <p className="font-mono text-14 text-meta">404</p>
        <h1 className="heading mt-4 max-w-[720px] text-32 font-medium text-hi md:text-48">This page holds nothing</h1>
        <p className="mt-6 max-w-[480px] text-16 text-mid">
          Like an empty token account. If you followed a wallet link, check the address is complete.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={buttonClass("primary", "lg")}>
            Back home
          </Link>
          <Link href="/check" className={buttonClass("secondary", "lg")}>
            Check a wallet
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
