/**
 * Shared pieces for link-preview images (next/og): brand colors, Geist loaded
 * from the installed `geist` package (no network), the mark, and a frame.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { FEE_PERCENT_LABEL } from "./config";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG = {
  ink: "#0E1014",
  paper: "#F3F1EA",
  mid: "#B3B8C3",
  meta: "#8B919E",
  accent: "#6495ED",
  accentInk: "#8FB1F4",
} as const;

const font = (file: string) => readFile(join(process.cwd(), "node_modules/geist/dist/fonts", file));

/** Geist Sans 400/600 and Geist Mono 500. Falls back to the renderer's default font if a file is missing. */
export async function ogFonts() {
  try {
    const [regular, semibold, mono] = await Promise.all([
      font("geist-sans/Geist-Regular.ttf"),
      font("geist-sans/Geist-SemiBold.ttf"),
      font("geist-mono/GeistMono-Medium.ttf"),
    ]);
    return [
      { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
      { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
      { name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const },
    ];
  } catch {
    return [];
  }
}

/** Spread into ImageResponse options; omits `fonts` entirely when none loaded, so the built-in font is used. */
export async function fontOptions() {
  const fonts = await ogFonts();
  return fonts.length > 0 ? { fonts } : {};
}

/** The tray-and-coin mark in dark-theme colors (paper tile, ink cut-outs). */
export function OgMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill={OG.paper} />
      <g fill="none" stroke={OG.ink} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 16.5h2.6l1.9 3.3h10l1.9-3.3h2.6v6.2a2.8 2.8 0 0 1-2.8 2.8H9.3a2.8 2.8 0 0 1-2.8-2.8z" strokeWidth="2.2" />
        <path d="M11 7.6h4.6M9.6 10.2h5.4M10.6 12.8h4.6" strokeWidth="1.5" />
      </g>
      <circle cx="21.4" cy="10.2" r="4" fill={OG.accent} />
    </svg>
  );
}

/** Ink canvas with the brand row on top, `children` in the middle, `footer` at the bottom. */
export function OgFrame({ children, footer, domain }: { children: ReactNode; footer: ReactNode; domain: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: OG.ink,
        backgroundImage:
          "radial-gradient(circle at 88% 8%, rgba(100,149,237,0.32), transparent 46%), radial-gradient(circle at 0% 100%, rgba(100,149,237,0.10), transparent 40%)",
        fontFamily: "Geist",
        color: OG.paper,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <OgMark size={76} />
          <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-0.02em" }}>SolCleanup</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: OG.meta }}>{domain}</div>
      </div>
      {children}
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 28, color: OG.mid }}>{footer}</div>
    </div>
  );
}

const Dot = () => <span style={{ color: OG.meta }}>·</span>;

/** Footer points separated by dots. */
export function OgPoints({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      {items.flatMap((t, i) => (i === 0 ? [<span key={t}>{t}</span>] : [<Dot key={`d${i}`} />, <span key={t}>{t}</span>]))}
    </div>
  );
}

/** The site-wide preview: wordmark, value proposition, fee from config. */
export async function genericOgImage(domain: string, headline: [string, string] = ["Reclaim the SOL locked", "in empty token accounts"]) {
  return new ImageResponse(
    (
      <OgFrame domain={domain} footer={<OgPoints items={["Non-custodial", "Simulated before you sign", `${FEE_PERCENT_LABEL} of what you reclaim`]} />}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.035em" }}>
          <div style={{ display: "flex" }}>{headline[0]}</div>
          <div style={{ display: "flex", color: OG.accentInk }}>{headline[1]}</div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE, ...(await fontOptions()) },
  );
}

export const domainOf = (url: string) => url.replace(/^https?:\/\//, "");
