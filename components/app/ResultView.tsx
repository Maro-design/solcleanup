"use client";

/**
 * Result screen: a celebration, then the receipts. A check draws itself, a
 * burst of cornflower coins flies out, and the amount counts up from zero.
 * Only what landed in the wallet is shown; every transaction links to Solscan.
 */
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, ExternalLink, LineChart, RotateCw, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button, buttonClass } from "@/components/ui/Button";
import { solscanTx } from "@/lib/config";
import { formatSol, formatUsd, plural, shortAddress } from "@/lib/format";
import type { BatchOutcome, Plan } from "@/lib/close";

const ease = [0.16, 1, 0.3, 1] as const;

/** A ring of coins bursting out from the badge, each on its own angle. */
function CoinBurst() {
  const coins = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
        const dist = 90 + (i % 4) * 26;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 6 + (i % 3) * 3, delay: 0.45 + (i % 5) * 0.03 };
      }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {coins.map((c, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-accent shadow-[0_0_12px_rgb(100_149_237/0.6)]"
          style={{ width: c.size, height: c.size, marginLeft: -c.size / 2, marginTop: -c.size / 2 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{ x: c.x, y: c.y, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
          transition={{ duration: 1.1, ease, delay: c.delay, times: [0, 0.25, 1] }}
        />
      ))}
    </div>
  );
}

function SuccessBadge({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative mx-auto flex size-24 items-center justify-center">
      {!reduce && (
        <>
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-accent"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
          />
          <CoinBurst />
        </>
      )}
      <motion.div
        className="relative flex size-24 items-center justify-center rounded-full bg-[linear-gradient(160deg,#8fb1f4,#4a78d6)] shadow-[0_18px_40px_-12px_rgb(47_94_196/0.7),inset_0_1px_0_rgb(255_255_255/0.35)]"
        initial={reduce ? false : { scale: 0.4, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
      >
        <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
          <motion.path
            d="M13 25 L21 33 L36 16"
            fill="none"
            stroke="white"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease, delay: 0.3 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export function ResultView({
  outcomes,
  plan,
  solPriceUsd,
  onRescan,
}: {
  outcomes: BatchOutcome[];
  plan: Plan;
  solPriceUsd: number | null;
  onRescan: () => void;
}) {
  const reduce = !!useReducedMotion();
  const ok = outcomes.filter((o) => o.ok);
  const failed = outcomes.filter((o) => !o.ok);
  const gross = ok.reduce((s, o) => s + o.rentLamports, 0);
  const fee = ok.reduce((s, o) => s + o.feeLamports, 0);
  const network = plan.ready.filter((b) => ok.some((o) => o.index === b.index)).reduce((s, b) => s + b.networkFeeLamports, 0);
  const net = Math.max(0, gross - fee - network);
  const closed = ok.reduce((s, o) => s + o.accounts, 0);
  const allFailed = ok.length === 0;
  const sol = (n: number) => formatSol(n);
  const shareText = encodeURIComponent(`I just reclaimed ${formatSol(net)} SOL from empty token accounts with SolCleanup 🧹`);
  // Same value on server and client, so the link never causes a hydration mismatch.
  const shareUrl = encodeURIComponent(process.env.NEXT_PUBLIC_SITE_URL ?? "https://solcleanup.xyz");

  return (
    <section
      aria-labelledby="result-title"
      className="relative mx-auto max-w-[720px] overflow-hidden rounded-3xl border border-line bg-raised px-6 pb-8 pt-12 text-center shadow-[0_40px_80px_-32px_rgb(var(--shadow-ink)/0.45)] sm:px-12"
    >
      {/* Soft cornflower glow behind the celebration */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(100_149_237/0.22),transparent_62%)]" />

      <div className="relative">
        {allFailed ? (
          <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-line bg-overlay text-danger">
            <X size={32} strokeWidth={2} aria-hidden />
          </div>
        ) : (
          <SuccessBadge reduce={reduce} />
        )}

        <motion.h1
          id="result-title"
          className="mt-8 text-16 text-mid"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.5 }}
        >
          {allFailed ? "No accounts were closed" : failed.length > 0 ? "Partly done. Here's what landed" : "SOL reclaimed"}
        </motion.h1>

        {!allFailed && (
          <>
            <motion.p
              className="display mt-2 font-mono text-48 font-medium text-accent-ink sm:text-72"
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.55 }}
            >
              +<AnimatedNumber value={net} format={sol} duration={1.4} /> <span className="text-accent-dim">SOL</span>
            </motion.p>
            <motion.p
              className="mt-2 text-14 text-meta"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              {solPriceUsd ? `≈ ${formatUsd((net / 1e9) * solPriceUsd)} · ` : ""}now in your wallet
            </motion.p>

            {/* Quick facts */}
            <motion.ul
              className="mt-8 flex flex-wrap justify-center gap-2"
              initial="hidden"
              animate="shown"
              variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.08, delayChildren: 1 } } }}
            >
              {[plural(closed, "account") + " closed", plural(ok.length, "transaction"), "Confirmed on-chain"].map((t) => (
                <motion.li
                  key={t}
                  variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease } } }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-base px-3 py-1.5 text-12 text-mid"
                >
                  <Check size={12} strokeWidth={2.25} className="text-accent-ink" aria-hidden />
                  {t}
                </motion.li>
              ))}
            </motion.ul>
          </>
        )}

        {/* Receipts */}
        <motion.ul
          className="mx-auto mt-8 max-w-[520px] divide-y divide-line overflow-hidden rounded-2xl border border-line bg-base text-left text-14"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 1.2 }}
        >
          {outcomes.map((o) => (
            <li key={o.index} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <span className={`flex size-6 items-center justify-center rounded-full ${o.ok ? "bg-[rgb(100_149_237/0.15)] text-accent-ink" : "bg-overlay text-danger"}`}>
                {o.ok ? <Check size={14} strokeWidth={2.25} aria-label="Succeeded" /> : <X size={14} strokeWidth={2.25} aria-label="Failed" />}
              </span>
              <span className="text-hi">
                {plural(o.accounts, "account")}
                {o.ok && <span className="text-meta"> · +{formatSol(Math.max(0, o.rentLamports - o.feeLamports))} SOL</span>}
              </span>
              {o.signature ? (
                <a
                  href={solscanTx(o.signature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 rounded font-mono text-12 text-mid hover:text-hi"
                >
                  {shortAddress(o.signature, 5)}
                  <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
                  <span className="sr-only">(view on Solscan)</span>
                </a>
              ) : (
                <span className="ml-auto font-mono text-12 text-meta">not sent</span>
              )}
              {!o.ok && <p className="w-full pl-9 text-12 text-meta">{o.error}. Nothing was charged for this one.</p>}
            </li>
          ))}
        </motion.ul>

        {/* Next steps */}
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
        >
          <Button variant={allFailed ? "primary" : "secondary"} onClick={onRescan}>
            <RotateCw size={16} strokeWidth={1.5} aria-hidden />
            {failed.length > 0 ? "Rescan and retry" : "Rescan wallet"}
          </Button>
          {!allFailed && (
            <>
              <Link href="/portfolio" className={buttonClass("secondary", "md")}>
                <LineChart size={16} strokeWidth={1.5} aria-hidden />
                View portfolio
              </Link>
              <a
                href={`https://x.com/intent/post?text=${shareText}&url=${shareUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("primary", "md")}
              >
                Share on X
                <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden />
              </a>
            </>
          )}
        </motion.div>
        {failed.length > 0 && <p className="mt-4 text-14 text-mid">Rescanning picks up any accounts still open.</p>}
      </div>
    </section>
  );
}
