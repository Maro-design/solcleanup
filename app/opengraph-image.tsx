/**
 * The link preview image (Discord, X, Telegram, iMessage…). Generated once at
 * build time from the brand: ink background, the tray-and-coin mark, Geist.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "SolCleanup — reclaim the SOL locked in empty token accounts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0E1014";
const PAPER = "#F3F1EA";
const MID = "#B3B8C3";
const META = "#8B919E";
const ACCENT = "#6495ED";
const ACCENT_INK = "#8FB1F4";

const font = (file: string) => readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans", file));

/** The tray-and-coin mark, dark-theme colors (paper tile, ink cut-outs). */
function Mark({ size: s }: { size: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32">
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill={PAPER} />
      <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 16.5h2.6l1.9 3.3h10l1.9-3.3h2.6v6.2a2.8 2.8 0 0 1-2.8 2.8H9.3a2.8 2.8 0 0 1-2.8-2.8z" strokeWidth="2.2" />
        <path d="M11 7.6h4.6M9.6 10.2h5.4M10.6 12.8h4.6" strokeWidth="1.5" />
      </g>
      <circle cx="21.4" cy="10.2" r="4" fill={ACCENT} />
    </svg>
  );
}

export default async function OpengraphImage() {
  const [regular, semibold] = await Promise.all([font("Geist-Regular.ttf"), font("Geist-SemiBold.ttf")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: INK,
          backgroundImage: `radial-gradient(circle at 88% 8%, rgba(100,149,237,0.32), transparent 46%), radial-gradient(circle at 0% 100%, rgba(100,149,237,0.10), transparent 40%)`,
          fontFamily: "Geist",
          color: PAPER,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Mark size={76} />
            <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-0.02em" }}>SolCleanup</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: META }}>solcleanup.xyz</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", fontSize: 76, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-0.035em" }}>
          <div style={{ display: "flex" }}>Reclaim the SOL locked</div>
          <div style={{ display: "flex", color: ACCENT_INK }}>in empty token accounts</div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, color: MID }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span>Non-custodial</span>
            <span style={{ color: META }}>·</span>
            <span>Simulated before you sign</span>
            <span style={{ color: META }}>·</span>
            <span>Straight to your wallet</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
