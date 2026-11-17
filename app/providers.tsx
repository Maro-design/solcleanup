"use client";

/**
 * Client providers: Solana connection, wallet adapters, wallet modal, Lenis.
 * Phantom, Solflare and Coinbase use explicit adapters; Backpack (and any
 * other Wallet Standard wallet) is detected automatically.
 */
import { useEffect, useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { MotionConfig } from "framer-motion";
import Lenis from "lenis";
import { captureReferral } from "@/lib/referral";
import { RPC_IS_FALLBACK, resolveRpcUrl } from "@/lib/config";

import "./wallet-adapter.css";

function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: { offset: -72 } });
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new CoinbaseWalletAdapter()],
    [],
  );

  const endpoint = useMemo(() => resolveRpcUrl(), []);

  // Remember ?ref=<code> from any landing page.
  useEffect(() => captureReferral(), []);

  useEffect(() => {
    if (RPC_IS_FALLBACK) {
      console.warn(
        process.env.NODE_ENV === "production"
          ? "[SolCleanup] NEXT_PUBLIC_RPC_URL is not set — the public RPC rejects browser requests."
          : "[SolCleanup] NEXT_PUBLIC_RPC_URL is not set — using the development RPC proxy.",
      );
    }
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <MotionConfig reducedMotion="user">
            <SmoothScroll />
            {children}
          </MotionConfig>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
