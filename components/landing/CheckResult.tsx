"use client";

/**
 * Result of a read-only wallet check. Leads with the one number that matters
 * (SOL the visitor would receive), then shows how the wallet's accounts split
 * into what gets claimed, optional dust and what stays untouched.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Check, Link2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { ScanResult } from "@/lib/scan";
import { formatSol, formatUsd, plural, shortAddress } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { LinkButton } from "@/components/ui/Button";
import { ConnectButton } from "@/components/ui/ConnectButton";

const ease = [0.16, 1, 0.3, 1] as const;

const SEGMENTS = [
  { key: "empty", label: "Ready to claim", dot: "bg-accent" },
  { key: "dust", label: "Dust under $2", dot: "bg-[rgb(100_149_237/0.4)]" },
  { key: "protected", label: "Kept safe", dot: "bg-line-hover" },
] as const;

function Tile({ dot, label, value, hint, delay, reduce }: { dot: string; label: string; value: number; hint: ReactNode; delay: number; reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay }}
      className="rounded-2xl border border-line bg-base px-4 py-3.5"
    >
      <p className="flex items-center gap-2 text-12 text-meta">
        <span className={`size-2 rounded-full ${dot}`} aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 font-mono text-20 leading-none text-hi tnum">{value.toLocaleString("en-US")}</p>
      <p className="mt-1.5 text-12 text-meta">{hint}</p>
    </motion.div>
  );
}

export function CheckResult({
  result,
  isOwnWallet,
  copied,
  onCopy,
}: {
  result: ScanResult;
  isOwnWallet: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  const reduce = !!useReducedMotion();
  const t = result.totals;
  const has = t.closable > 0;
  const counts = { empty: t.empty, dust: t.dust, protected: t.protected };
  const total = Math.max(1, t.empty + t.dust + t.protected);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease }}
      className="relative overflow-hidden rounded-3xl border border-line bg-raised shadow-[0_32px_64px_-32px_rgb(var(--shadow-ink)/0.35)]"
    >
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-[radial-gradient(circle,rgb(100_149_237/0.2),transparent_65%)]" />

      <div className="relative p-6 sm:p-8">
        {/* Wallet */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className="size-7 shrink-0 rounded-full bg-[conic-gradient(from_200deg,#8fb1f4,#4a78d6,#b9cdf7,#8fb1f4)]" />
            <span className="truncate font-mono text-14 text-hi">{shortAddress(result.owner, 6)}</span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-base px-2.5 py-1 text-12 text-mid">
            <ShieldCheck size={13} strokeWidth={1.75} aria-hidden />
            Read-only
          </span>
        </div>

        {/* Hero amount */}
        <p className="mt-8 text-14 text-mid">{has ? "You'd receive" : "Nothing to claim right now"}</p>
        <p className={`mt-2 flex items-baseline gap-2 font-mono text-48 leading-none tracking-tight ${has ? "text-accent-ink" : "text-meta"}`}>
          <AnimatedNumber value={t.netLamports} format={(n) => formatSol(n)} duration={1.1} />
          <span className={`text-20 ${has ? "text-accent-dim" : "text-meta"}`}>SOL</span>
        </p>
        <p className="mt-3 text-14 text-meta tnum">
          {has
            ? `${result.solPriceUsd !== null ? `≈ ${formatUsd((t.netLamports / 1e9) * result.solPriceUsd)} · ` : ""}from ${plural(t.closable, "empty account")}`
            : t.accounts > 0
              ? "Every account either holds a balance or is protected."
              : "This wallet has no token accounts."}
        </p>

        {t.accounts > 0 && (
          <>
            {/* Composition bar */}
            <div className="mt-8 flex h-2 w-full gap-1 overflow-hidden rounded-full" role="img" aria-label={`${t.empty} ready to claim, ${t.dust} dust, ${t.protected} kept safe`}>
              {SEGMENTS.map((s, i) =>
                counts[s.key] > 0 ? (
                  <motion.span
                    key={s.key}
                    className={`h-full origin-left rounded-full ${s.dot}`}
                    style={{ flexGrow: counts[s.key], flexBasis: 0, minWidth: 6 }}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, ease, delay: 0.25 + i * 0.12 }}
                  />
                ) : null,
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Tile reduce={reduce} delay={0.3} dot={SEGMENTS[0].dot} label={SEGMENTS[0].label} value={t.empty} hint="Closed for you" />
              <Tile reduce={reduce} delay={0.38} dot={SEGMENTS[1].dot} label={SEGMENTS[1].label} value={t.dust} hint="Optional, your pick" />
              <Tile reduce={reduce} delay={0.46} dot={SEGMENTS[2].dot} label={SEGMENTS[2].label} value={t.protected} hint={`${Math.round((t.protected / total) * 100)}% never touched`} />
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex flex-col-reverse gap-3 border-t border-line bg-base/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <button type="button" onClick={onCopy} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg text-14 text-mid transition-colors hover:text-hi">
          {copied ? <Check size={16} strokeWidth={1.75} aria-hidden /> : <Link2 size={16} strokeWidth={1.5} aria-hidden />}
          {copied ? "Link copied" : "Copy link"}
        </button>
        {has &&
          (isOwnWallet ? (
            <LinkButton href="/app" variant="primary">
              Open dashboard
            </LinkButton>
          ) : (
            <ConnectButton variant="primary" label="Connect to claim" />
          ))}
      </div>
    </motion.div>
  );
}
