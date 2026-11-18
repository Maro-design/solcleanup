"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAddress } from "@/lib/scan";
import { LogOut } from "lucide-react";
import { Dashboard } from "@/components/app/Dashboard";
import { Button } from "@/components/ui/Button";

/**
 * The dashboard is reached by connecting a wallet from any Connect button.
 * Without a connected wallet there is nothing to show, so /app sends the
 * visitor home (after giving auto-connect a moment to restore a session).
 */
export function AppGate() {
  const { publicKey, connecting, wallet, disconnect } = useWallet();
  const router = useRouter();
  const [watch, setWatch] = useState<PublicKey | null>(null);
  const [checked, setChecked] = useState(false);

  // Development only: /app?watch=<address> previews the dashboard read-only.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const q = new URLSearchParams(window.location.search).get("watch");
    setWatch(q ? parseAddress(q) : null);
  }, []);

  useEffect(() => {
    if (publicKey || connecting || watch) return;
    // A previously chosen wallet may still be auto-connecting; wait briefly.
    const t = setTimeout(() => setChecked(true), wallet ? 1500 : 300);
    return () => clearTimeout(t);
  }, [publicKey, connecting, wallet, watch]);

  useEffect(() => {
    if (checked && !publicKey && !watch) router.replace("/");
  }, [checked, publicKey, watch, router]);

  if (!publicKey && watch) return <Dashboard owner={watch} readOnly />;

  if (!publicKey) {
    return (
      <>
        {/* The connected view has its own h1; this keeps one on the waiting state too. */}
        <h1 className="sr-only">SolCleanup dashboard</h1>
        <p className="mt-32 text-center text-14 text-meta" aria-live="polite">
          {connecting ? "Connecting wallet…" : "Opening…"}
        </p>
      </>
    );
  }

  return (
    <>
      <Dashboard owner={publicKey} />
      <div className="mt-16 flex justify-center">
        <Button variant="ghost" size="sm" onClick={() => void disconnect()}>
          <LogOut size={16} strokeWidth={1.5} aria-hidden />
          Disconnect wallet
        </Button>
      </div>
    </>
  );
}
