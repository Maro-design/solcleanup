"use client";

/**
 * Wallet connect control. Disconnected → opens the wallet modal and, when
 * `goToApp` is set, routes to the dashboard once a wallet connects.
 * Connected → links to the dashboard with the short address.
 */
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowRight, Wallet } from "lucide-react";
import { buttonClass } from "./Button";
import { shortAddress } from "@/lib/format";
import Link from "next/link";

interface Props {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  label?: string;
  goToApp?: boolean;
  className?: string;
  /** Hide the label below 640px (nav on phones). */
  compact?: boolean;
}

export function ConnectButton({ size = "md", variant = "secondary", label = "Connect wallet", goToApp = true, className = "", compact = false }: Props) {
  const { publicKey, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const requested = useRef(false);

  useEffect(() => {
    if (publicKey && requested.current && goToApp) {
      requested.current = false;
      router.push("/app");
    }
  }, [publicKey, goToApp, router]);

  if (publicKey) {
    return (
      <Link href="/app" className={buttonClass(variant, size, className)}>
        <span className="font-mono text-14 tnum">{shortAddress(publicKey.toBase58(), compact ? 3 : 4)}</span>
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        <span className="sr-only">Open dashboard</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      onClick={() => {
        requested.current = true;
        setVisible(true);
      }}
      disabled={connecting}
    >
      <Wallet size={16} strokeWidth={1.5} aria-hidden />
      <span className={compact ? "max-sm:sr-only" : ""}>{connecting ? "Connecting" : label}</span>
    </button>
  );
}
