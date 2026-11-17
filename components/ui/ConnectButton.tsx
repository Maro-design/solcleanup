"use client";

/**
 * Wallet connect control.
 *  - Disconnected: opens the wallet picker (or reconnects straight to the
 *    wallet used last time, unless it was forgotten) and, when `goToApp` is
 *    set, routes to the dashboard once a wallet connects.
 *  - Connected: shows the short address; clicking it opens a menu with
 *    "Disconnect" and "Disconnect and forget".
 */
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Copy, LogOut, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "./Button";
import { shortAddress } from "@/lib/format";

interface Props {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  label?: string;
  goToApp?: boolean;
  className?: string;
  /** Hide the label below 640px (nav on phones). */
  compact?: boolean;
  /** When connected: true shows the wallet menu (nav); false links to the dashboard (page CTAs). */
  menu?: boolean;
}

/** The wallet to reconnect to after a plain "Disconnect" (cleared by "forget"). */
const LAST_WALLET_KEY = "solcleanup-last-wallet";
/** wallet-adapter's own key for the selected wallet (drives auto-connect). */
const ADAPTER_KEY = "walletName";

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage blocked */
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* storage blocked */
    }
  },
};

export function ConnectButton({ size = "md", variant = "secondary", label = "Connect wallet", goToApp = true, className = "", compact = false, menu = false }: Props) {
  const { publicKey, connecting, wallet, wallets, select, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const requested = useRef(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (publicKey && requested.current && goToApp) {
      requested.current = false;
      router.push("/app");
    }
  }, [publicKey, goToApp, router]);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!publicKey) setOpen(false);
  }, [publicKey]);

  const doDisconnect = async (forget: boolean) => {
    const name = wallet?.adapter.name;
    setOpen(false);
    await disconnect().catch(() => undefined);
    if (forget) {
      store.del(LAST_WALLET_KEY);
      store.del(ADAPTER_KEY);
    } else if (name) {
      store.set(LAST_WALLET_KEY, name);
    }
  };

  const connect = () => {
    requested.current = true;
    // Reconnect straight to the last wallet if it's still installed; otherwise show the picker.
    const last = store.get(LAST_WALLET_KEY);
    const match = last ? wallets.find((w) => w.adapter.name === last && w.readyState === WalletReadyState.Installed) : undefined;
    if (match) select(match.adapter.name as WalletName);
    else setVisible(true);
  };

  if (publicKey && !menu) {
    return (
      <Link href="/app" className={buttonClass(variant, size, className)}>
        <span className="font-mono text-14 tnum">{shortAddress(publicKey.toBase58(), compact ? 3 : 4)}</span>
        <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        <span className="sr-only">Open dashboard</span>
      </Link>
    );
  }

  if (publicKey) {
    const address = publicKey.toBase58();
    return (
      <div ref={wrap} className="relative">
        <button
          type="button"
          className={buttonClass(variant, size, className)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          {wallet?.adapter.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wallet.adapter.icon} alt="" width={16} height={16} className="size-4 rounded" />
          ) : (
            <Wallet size={16} strokeWidth={1.5} aria-hidden />
          )}
          <span className="font-mono text-14 tnum">{shortAddress(address, compact ? 3 : 4)}</span>
          <ChevronDown size={14} strokeWidth={1.75} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          <span className="sr-only">Wallet menu</span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              id={menuId}
              role="menu"
              aria-label="Wallet"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right overflow-hidden rounded-2xl border border-line bg-raised p-1.5 text-left shadow-[0_24px_48px_-16px_rgb(var(--shadow-ink)/0.35)]"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-12 text-meta">{wallet?.adapter.name ?? "Wallet"}</p>
                  <p className="truncate font-mono text-14 text-hi">{shortAddress(address, 6)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(address).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1400);
                    });
                  }}
                  className="lift inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-mid hover:text-hi"
                  aria-label={copied ? "Address copied" : "Copy address"}
                >
                  {copied ? <Check size={14} strokeWidth={2} className="text-accent-ink" aria-hidden /> : <Copy size={14} strokeWidth={1.75} aria-hidden />}
                </button>
              </div>
              <div className="my-1 h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => void doDisconnect(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-14 text-hi transition-colors hover:bg-overlay"
              >
                <LogOut size={16} strokeWidth={1.75} className="text-mid" aria-hidden />
                Disconnect
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => void doDisconnect(true)}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-14 text-danger transition-colors hover:bg-overlay"
              >
                <Trash2 size={16} strokeWidth={1.75} className="mt-0.5" aria-hidden />
                <span>
                  Disconnect and forget
                  <span className="block text-12 text-meta">Next time, pick your wallet again</span>
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <button type="button" className={buttonClass(variant, size, className)} onClick={connect} disabled={connecting}>
      <Wallet size={16} strokeWidth={1.5} aria-hidden />
      <span className={compact ? "max-sm:sr-only" : ""}>{connecting ? "Connecting" : label}</span>
    </button>
  );
}
