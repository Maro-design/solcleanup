import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "SolCleanup — reclaim SOL from empty token accounts",
  description:
    "Find the empty token accounts in your Solana wallet and close them to get back the rent they hold. Non-custodial, simulated before you sign, fee shown up front.",
  // Absolute URLs for the preview image; production falls back to the real domain.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV === "production" ? "https://solcleanup.xyz" : "http://localhost:3210"),
  ),
  applicationName: "SolCleanup",
  openGraph: {
    siteName: "SolCleanup",
    title: "SolCleanup — Reclaim SOL from empty token accounts",
    description: "Close the empty token accounts in your Solana wallet and get back the rent they hold. Non-custodial, simulated before you sign.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SolCleanup — Reclaim SOL from empty token accounts",
    description: "Close the empty token accounts in your Solana wallet and get back the rent they hold. Non-custodial, simulated before you sign.",
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1014" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint so there is no light/dark flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-raised focus:px-4 focus:py-2 focus:text-14"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
