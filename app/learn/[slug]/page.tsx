import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { LEARN_ARTICLES, learnArticle } from "@/lib/content/learn";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buttonClass } from "@/components/ui/Button";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return LEARN_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = learnArticle((await params).slug);
  if (!a) return {};
  const base = pageMetadata({ title: a.metaTitle, description: a.description, path: `/learn/${a.slug}`, type: "article" });
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article", publishedTime: a.published, modifiedTime: a.updated },
  };
}

const dateLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export default async function LearnArticlePage({ params }: Props) {
  const a = learnArticle((await params).slug);
  if (!a) notFound();
  const url = `${SITE_URL}/learn/${a.slug}`;
  const Body = a.body;
  const others = LEARN_ARTICLES.filter((o) => o.slug !== a.slug);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.description,
      datePublished: a.published,
      dateModified: a.updated,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      image: [`${SITE_URL}/opengraph-image`],
      inLanguage: "en",
      author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE_URL}/learn` },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
  ];

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <article className="mx-auto w-full max-w-[720px] px-6">
        <nav aria-label="Breadcrumb" className="text-14 text-meta">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-hi">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/learn" className="hover:text-hi">
                Learn
              </Link>
            </li>
          </ol>
        </nav>
        <h1 className="heading mt-6 text-32 font-medium text-hi md:text-48">{a.title}</h1>
        <p className="mt-4 text-14 text-meta">
          Updated <time dateTime={a.updated}>{dateLabel(a.updated)}</time>
        </p>
        <div className="mt-10">
          <Body />
        </div>

        <aside className="mt-16 flex flex-col gap-6 rounded-2xl border border-line bg-raised p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" aria-label="Check a wallet">
          <div>
            <p className="text-20 font-medium text-hi">See what your wallet is holding back</p>
            <p className="mt-2 text-14 text-mid">Read-only, free, and takes seconds.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link href="/check" className={buttonClass("primary", "md")}>
              Check a wallet
            </Link>
            <Link href="/app" className={buttonClass("secondary", "md")}>
              Open the app
            </Link>
          </div>
        </aside>

        <nav aria-label="More guides" className="mt-16 border-t border-line pt-10">
          <p className="text-14 text-meta">More guides</p>
          <ul className="mt-4 divide-y divide-line">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/learn/${o.slug}`} className="group flex items-center justify-between gap-4 py-4 text-16 text-hi">
                  {o.title}
                  <ArrowRight size={16} strokeWidth={1.5} className="shrink-0 text-meta transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </PageShell>
  );
}
