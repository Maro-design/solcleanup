import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { ClosingCta } from "@/components/landing/ClosingCta";
import { JsonLd } from "@/components/seo/JsonLd";
import { LEARN_ARTICLES } from "@/lib/content/learn";
import { pageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Learn: Solana rent and token account cleanup guides",
  description:
    "Plain guides to Solana rent: why token accounts lock SOL, how to close them yourself or with a tool, how much your wallet holds, and what cleanup really costs.",
  path: "/learn",
});

const BREADCRUMBS = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE_URL}/learn` },
  ],
};

export default function LearnIndex() {
  return (
    <PageShell>
      <JsonLd data={BREADCRUMBS} />
      <section className="mx-auto w-full max-w-[1200px] px-6" aria-labelledby="learn-title">
        <h1 id="learn-title" className="heading max-w-[720px] text-32 font-medium text-hi md:text-48">
          Guides to Solana rent and wallet cleanup
        </h1>
        <p className="mt-6 max-w-[560px] text-16 text-mid">
          What rent is, where your SOL is sitting, and how to get it back, whether you use SolCleanup or not.
        </p>
        <ul className="mt-12 grid gap-4 border-t border-line pt-12 md:grid-cols-2">
          {LEARN_ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/learn/${a.slug}`}
                className="lift group flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-raised p-6 transition-colors hover:border-line-hover"
              >
                <div>
                  <h2 className="text-20 font-medium text-hi">{a.title}</h2>
                  <p className="mt-3 text-14 text-mid">{a.summary}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-14 text-accent-ink">
                  Read the guide
                  <ArrowRight size={16} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ClosingCta />
    </PageShell>
  );
}
