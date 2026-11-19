"use client";

/**
 * Read-only check for any wallet — no connection needed. Submitting scans in
 * the browser straight away (live progress) and puts /check/<address> in the
 * address bar as the shareable link. Opening that link fresh renders it on the
 * server; if the server couldn't finish (very large wallet, rate limit), the
 * page hands the address back here and the browser scans instead.
 */
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useScan } from "@/hooks/useScan";
import { parseAddress } from "@/lib/scan";
import { summarize, type CheckSummary } from "@/lib/checkSummary";
import { Button } from "@/components/ui/Button";
import { CheckResult } from "./CheckResult";
import { ScanProgress } from "@/components/app/ScanProgress";
import { Reveal } from "@/components/ui/Reveal";

interface Props {
  /** Address of a /check/[address] page. */
  address?: string;
  /** Result the server already computed; when absent the browser scans `address`. */
  initial?: CheckSummary | null;
}

export function AddressCheck({ address, initial = null }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(address ?? "");
  // Scan in the browser only when the server didn't (or there's no address yet).
  const [target, setTarget] = useState<PublicKey | null>(() => (address && !initial ? parseAddress(address) : null));
  const [invalid, setInvalid] = useState(false);
  const [copied, setCopied] = useState(false);
  const { state, scan } = useScan(target, { auto: true });
  const { publicKey } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);

  // Old ?check= links move to the shareable page.
  useEffect(() => {
    if (address) return;
    const key = parseAddress(new URLSearchParams(window.location.search).get("check") ?? "");
    if (key) router.replace(`/check/${key.toBase58()}`);
  }, [address, router]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const key = parseAddress(value);
    if (!key) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    // Scan right here in the browser, with live progress, and put the shareable
    // link in the address bar without a server round trip. The server-rendered
    // /check/<address> page is for links opened or unfurled elsewhere.
    const path = `/check/${key.toBase58()}`;
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    if (target?.equals(key)) void scan(key);
    else setTarget(key);
  };

  const shareUrl = (owner: string) => `${window.location.origin}/check/${owner}`;

  const copyLink = async (owner: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(owner));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — the URL bar already has the link */
    }
  };

  const scanned = state.status === "done" ? state.result : null;
  const result = useMemo(() => (scanned ? summarize(scanned) : state.status === "idle" ? initial : null), [scanned, state.status, initial]);
  const isOwnWallet = !!(publicKey && result && publicKey.toBase58() === result.owner);
  const scanningAddress = target?.toBase58() ?? address;

  return (
    <section id="check" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-6" aria-labelledby="check-title">
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <Reveal>
          <h1 id="check-title" className="heading text-32 font-medium text-hi md:text-48">
            Check any wallet
          </h1>
          <p className="mt-6 max-w-[440px] text-16 text-mid">
            Paste a Solana address to see how much rent is waiting in it. Read-only — nothing to connect, nothing to sign.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" noValidate>
            <label htmlFor="address" className="sr-only">
              Solana wallet address
            </label>
            <input
              ref={inputRef}
              id="address"
              name="address"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Wallet address"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setInvalid(false);
              }}
              aria-invalid={invalid}
              aria-describedby={invalid ? "address-error" : undefined}
              className={`h-12 w-full min-w-0 shrink-0 rounded-[10px] sm:w-auto sm:flex-1 border bg-raised px-4 font-mono text-14 text-hi placeholder:text-meta transition-colors focus:outline-none focus-visible:border-accent ${invalid ? "border-danger" : "border-line hover:border-line-hover"}`}
            />
            <Button type="submit" size="lg" disabled={state.status === "scanning"}>
              <Search size={16} strokeWidth={1.5} aria-hidden />
              Check
            </Button>
          </form>
          {invalid && (
            <p id="address-error" role="alert" className="mt-2 text-14 text-danger">
              That doesn't look like a Solana address
            </p>
          )}

          <div className="mt-6" aria-live="polite">
            <AnimatePresence mode="wait">
              {state.status === "scanning" && (
                <motion.div key="scan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ScanProgress progress={state.progress} address={scanningAddress} />
                </motion.div>
              )}
              {state.status === "error" && (
                <motion.p key="err" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-line bg-raised p-6 text-14 text-mid">
                  {state.message}.
                </motion.p>
              )}
              {result && (
                <CheckResult
                  key={`r-${result.scannedAt}`}
                  result={result}
                  isOwnWallet={isOwnWallet}
                  copied={copied}
                  onCopy={() => void copyLink(result.owner)}
                />
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
