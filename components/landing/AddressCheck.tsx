"use client";

/**
 * Read-only check for any wallet — no connection needed. The address is
 * mirrored into ?check= so a result can be shared as a link.
 */
import { useWallet } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Link2, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useScan } from "@/hooks/useScan";
import { parseAddress } from "@/lib/scan";
import { FEE_PERCENT_LABEL } from "@/lib/config";
import { formatSol, formatUsd, plural, shortAddress } from "@/lib/format";
import { Ledger } from "@/components/ui/Ledger";
import { Button, LinkButton } from "@/components/ui/Button";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ScanProgress } from "@/components/app/ScanProgress";
import { Reveal } from "@/components/ui/Reveal";

export function AddressCheck() {
  const [value, setValue] = useState("");
  const [target, setTarget] = useState<PublicKey | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [copied, setCopied] = useState(false);
  const { state, scan } = useScan(target, { auto: true });
  const { publicKey } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick up a shared ?check= link on load.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("check");
    if (!q) return;
    const key = parseAddress(q);
    if (key) {
      setValue(key.toBase58());
      setTarget(key);
    }
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const key = parseAddress(value);
    if (!key) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    const url = new URL(window.location.href);
    url.searchParams.set("check", key.toBase58());
    url.hash = "check";
    window.history.replaceState(null, "", url);
    if (target?.equals(key)) void scan(key);
    else setTarget(key);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — the URL bar already has the link */
    }
  };

  const result = state.status === "done" ? state.result : null;
  const isOwnWallet = !!(publicKey && target && publicKey.equals(target));

  return (
    <section id="check" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-6" aria-labelledby="check-title">
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <Reveal>
          <h2 id="check-title" className="heading text-32 font-medium text-hi md:text-48">
            Check any wallet
          </h2>
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
                  <ScanProgress progress={state.progress} address={target?.toBase58()} />
                </motion.div>
              )}
              {state.status === "error" && (
                <motion.p key="err" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-line bg-raised p-6 text-14 text-mid">
                  {state.message}.
                </motion.p>
              )}
              {result && (
                <motion.div
                  key={`r-${result.scannedAt}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-2xl border border-line bg-raised p-6 sm:p-8"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-mono text-14 text-mid">{shortAddress(result.owner, 6)}</p>
                    <p className="text-14 text-meta">
                      {plural(result.totals.accounts, "token account")}, {result.totals.closable.toLocaleString("en-US")} closable
                    </p>
                  </div>

                  {result.totals.closable > 0 ? (
                    <>
                      {/* Lead with what the visitor actually gets; gross lives in the ledger. */}
                      <p className="mt-6 text-14 text-mid">You&apos;d receive</p>
                      <p className="mt-1 font-mono text-48 leading-none text-accent-ink">
                        <AnimatedNumber value={result.totals.netLamports} format={(n) => formatSol(n)} />
                        <span className="ml-2 text-20 text-accent-dim">SOL</span>
                      </p>
                      {result.solPriceUsd !== null && (
                        <p className="mt-2 font-mono text-14 text-meta tnum">≈ {formatUsd((result.totals.netLamports / 1e9) * result.solPriceUsd)}</p>
                      )}
                      <Ledger
                        className="mt-8"
                        rows={[
                          { label: `Rent in ${plural(result.totals.closable, "empty account")}`, value: `${formatSol(result.totals.reclaimableLamports)} SOL` },
                          { label: `Service fee (${FEE_PERCENT_LABEL})`, value: `−${formatSol(result.totals.feeLamports)} SOL`, tone: "deduct" },
                          { label: "Network fee", value: "shown before signing", tone: "muted" },
                        ]}
                        total={{ label: "You'd receive", value: `${formatSol(result.totals.netLamports)} SOL` }}
                      />
                    </>
                  ) : (
                    <>
                      <p className="mt-6 text-14 text-mid">Reclaimable now</p>
                      <p className="mt-1 font-mono text-48 leading-none text-hi tnum">
                        0.0000<span className="ml-2 text-20 text-meta">SOL</span>
                      </p>
                      <p className="mt-6 text-14 text-mid">
                        {result.totals.accounts > 0
                          ? "Nothing to reclaim. Every account either holds a balance or is protected."
                          : "Nothing to reclaim. This wallet has no token accounts."}
                      </p>
                    </>
                  )}

                  {result.totals.protected + result.totals.dust > 0 && (
                    <p className="mt-4 text-12 text-meta">
                      {plural(result.totals.protected, "protected account")} left alone (tokens worth $2 or more, NFTs, LP and staking tokens){result.totals.dust > 0 ? `, and ${plural(result.totals.dust, "dust account")} under $2 you can choose to burn and close after connecting` : ""}.
                    </p>
                  )}

                  <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-lg text-14 text-mid transition-colors hover:text-hi">
                      {copied ? <Check size={16} strokeWidth={1.5} aria-hidden /> : <Link2 size={16} strokeWidth={1.5} aria-hidden />}
                      {copied ? "Link copied" : "Copy link to this result"}
                    </button>
                    {result.totals.closable > 0 &&
                      (isOwnWallet ? (
                        <LinkButton href="/app" variant="primary">
                          Open dashboard
                        </LinkButton>
                      ) : (
                        <ConnectButton variant="primary" label="Connect this wallet to close them" />
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
