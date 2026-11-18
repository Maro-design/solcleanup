import type { MetadataRoute } from "next";
import { LEARN_ARTICLES } from "@/lib/content/learn";
import { SITE_URL } from "@/lib/site";

/** When the marketing pages' content last changed. Bump when you edit them. */
const PAGES_UPDATED = "2026-11-18";

/** Marketing and learn pages only. Wallet pages (/check/<address>) and dashboards are never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/check", priority: 0.9, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/safety", priority: 0.8, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
    { path: "/docs", priority: 0.7, changeFrequency: "monthly" },
    { path: "/learn", priority: 0.7, changeFrequency: "weekly" },
  ];
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p.path}`, lastModified: PAGES_UPDATED, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...LEARN_ARTICLES.map((a) => ({ url: `${SITE_URL}/learn/${a.slug}`, lastModified: a.updated, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
