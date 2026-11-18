/**
 * Per-page metadata: title, description, a self-referencing canonical and
 * matching Open Graph / X tags (Next doesn't derive og:title from title).
 */
import type { Metadata } from "next";
import { SITE_NAME } from "./site";

interface PageMeta {
  /** Page title; the layout template appends " · SolCleanup". */
  title: string;
  description: string;
  /** Path with a leading slash and no trailing slash, e.g. "/faq". */
  path: string;
  /** Use the title as-is (home page). */
  absoluteTitle?: boolean;
  /** Private dashboards: never indexed. */
  noindex?: boolean;
  type?: "website" | "article";
  /** The route has its own opengraph-image file; don't name the site image. */
  ownImage?: boolean;
}

export function pageMetadata({ title, description, path, absoluteTitle = false, noindex = false, type = "website", ownImage = false }: PageMeta): Metadata {
  const full = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  // Setting openGraph replaces the layout's, so the site image is named again here.
  // Routes with their own opengraph-image file pass ownImage so theirs is used.
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: `${SITE_NAME}: reclaim the SOL locked in empty token accounts` };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { siteName: SITE_NAME, title: full, description, url: path, type, locale: "en_US", ...(ownImage ? {} : { images: [image] }) },
    twitter: { card: "summary_large_image", title: full, description, ...(ownImage ? {} : { images: [image] }) },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
