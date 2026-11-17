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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3210"),
  openGraph: {
    title: "SolCleanup",
    description: "Reclaim the SOL locked in empty token accounts. Non-custodial.",
    type: "website",
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
