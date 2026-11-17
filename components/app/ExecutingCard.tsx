"use client";

/**
 * The "in flight" card: preparing → waiting for the wallet → sending.
 * A wallet mark sits at the centre: a spinning arc while preparing, calm
 * pulses while it waits for approval, and coins flowing in while the
 * transactions land. A three-step tracker says where things stand.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ExternalLink, Loader2, Wallet, X } from "lucide-react";
import type { ExecutionProgress, Plan } from "@/lib/close";
import { formatSol, plural, shortAddress } from "@/lib/format";
import { solscanTx } from "@/lib/config";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

const ease = [0.16, 1, 0.3, 1] as const;
const STEPS = ["Prepare", "Approve", "Confirm"] as const;

function stepIndex(phase: ExecutionProgress["phase"]): number {
  return phase === "preparing" ? 0 : phase === "signing" ? 1 : 2;
}

/** Wallet mark with a phase-specific animation around it. */
function WalletMark({ phase, reduce }: { phase: ExecutionProgress["phase"]; reduce: boolean }) {
  return (
    <div className="relative mx-auto flex size-28 items-center justify-center">
      {!reduce && phase === "preparing" && (
        <motion.span
          aria-hidden
          className="absolute inset-1 rounded-full border-2 border-transparent border-t-accent border-r-[rgb(100_149_237/0.35)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
      )}
      {!reduce &&
        phase === "signing" &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute inset-3 rounded-full border-2 border-accent"
            initial={{ scale: 0.85, opacity: 0.55 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: i * 1 }}
          />
        ))}
      {!reduce &&
        phase === "sending" &&
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <motion.span
              key={i}
              aria-hidden
              className="absolute size-2.5 rounded-full bg-accent shadow-[0_0_10px_rgb(100_149_237/0.7)]"
              initial={{ x: Math.cos(a) * 64, y: Math.sin(a) * 64, opacity: 0, scale: 1 }}
              animate={{ x: 0, y: 0, opacity: [0, 1, 0], scale: [1, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeIn", delay: i * 0.2 }}
            />
          );
        })}
      <motion.div
        className="relative flex size-20 items-center justify-center rounded-[22px] bg-[linear-gradient(160deg,#8fb1f4,#4a78d6)] text-white shadow-[0_18px_40px_-12px_rgb(47_94_196/0.7),inset_0_1px_0_rgb(255_255_255/0.35)]"
        animate={reduce || phase !== "signing" ? { y: 0 } : { y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Wallet size={34} strokeWidth={1.75} aria-hidden />
      </motion.div>
    </div>
  );
}

export function ExecutingCard({ progress: p, plan }: { progress: ExecutionProgress; plan: Plan }) {
  const reduce = !!useReducedMotion();
  const step = stepIndex(p.phase);
  const t = plan.totals;
  const sent = p.outcomes.length > 0;
  const title =
    p.phase === "preparing" ? "Getting things ready" : p.phase === "signing" ? "Approve in your wallet" : "Claiming your SOL";
  const sub =
    p.phase === "preparing"
      ? "Re-checking your accounts and building the transaction"
      : p.phase === "signing"
        ? "Check your wallet window and approve. Nothing is sent until you do."
        : p.batchCount > 1
          ? `Transaction ${Math.min(Math.max(p.batchIndex, 1), p.batchCount)} of ${p.batchCount} landing on Solana`
          : "Landing on Solana";

  return (
    <div className="relative overflow-hidden rounded-t-3xl border border-line bg-raised px-6 pb-6 pt-10 text-center shadow-[0_40px_80px_-24px_rgb(var(--shadow-ink)/0.5)] sm:rounded-3xl sm:px-8">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(100_149_237/0.22),transparent_62%)]" />

      <div className="relative" aria-live="polite">
        <WalletMark phase={p.phase} reduce={reduce} />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={p.phase}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease }}
          >
            <p className="heading mt-6 text-20 font-medium text-hi">{title}</p>
            <p className="mx-auto mt-2 max-w-[320px] text-14 text-mid">{sub}</p>
          </motion.div>
        </AnimatePresence>

        {/* Amount */}
        <div className="mx-auto mt-6 w-fit rounded-2xl border border-[rgb(100_149_237/0.3)] bg-[rgb(100_149_237/0.07)] px-5 py-3">
          <p className="text-12 text-meta">{sent ? "Claimed so far" : "You'll receive"}</p>
          <p className="mt-1 font-mono text-32 leading-none text-accent-ink">
            +<AnimatedNumber value={sent ? p.recoveredLamports : t.netLamports} format={(n) => formatSol(n)} />
            <span className="ml-1.5 text-14 text-accent-dim">SOL</span>
          </p>
          <p className="mt-1 text-12 text-meta tnum">
            {sent ? `${p.closedAccounts} of ${t.accounts} accounts closed` : `from ${plural(t.accounts, "account")}`}
          </p>
        </div>

        {/* Step tracker */}
        <ol className="mx-auto mt-6 flex max-w-[320px] items-center" aria-label="Progress">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex size-7 items-center justify-center rounded-full border text-12 transition-colors duration-300 ${
                      done ? "border-accent bg-accent text-[var(--on-accent)]" : active ? "border-accent text-accent-ink" : "border-line text-meta"
                    }`}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <Check size={14} strokeWidth={2.5} aria-hidden /> : active ? <Loader2 size={14} strokeWidth={2.25} className="animate-spin motion-reduce:animate-none" aria-hidden /> : i + 1}
                  </span>
                  <span className={`text-12 ${active || done ? "text-hi" : "text-meta"}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="relative mx-2 mb-5 h-0.5 flex-1 overflow-hidden rounded-full bg-overlay">
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full bg-accent"
                      initial={false}
                      animate={{ scaleX: done ? 1 : 0 }}
                      transition={{ duration: 0.5, ease }}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Live transactions */}
        {p.batchCount > 0 && p.phase === "sending" && (
          <ul className="mx-auto mt-6 max-w-[360px] divide-y divide-line overflow-hidden rounded-2xl border border-line bg-base text-left text-14">
            {Array.from({ length: p.batchCount }, (_, i) => {
              const o = p.outcomes[i];
              return (
                <motion.li
                  key={i}
                  initial={reduce ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease, delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className={`flex size-6 items-center justify-center rounded-full ${o ? (o.ok ? "bg-[rgb(100_149_237/0.15)] text-accent-ink" : "bg-overlay text-danger") : "text-meta"}`}>
                    {o ? (o.ok ? <Check size={14} strokeWidth={2.25} aria-hidden /> : <X size={14} strokeWidth={2.25} aria-hidden />) : <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                  </span>
                  <span className="text-mid">Transaction {i + 1}</span>
                  {o?.signature && (
                    <a href={solscanTx(o.signature)} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-mono text-12 text-meta hover:text-hi">
                      {shortAddress(o.signature, 4)}
                      <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
                    </a>
                  )}
                </motion.li>
              );
            })}
          </ul>
        )}

        {p.phase === "signing" && (
          <p className="mx-auto mt-6 max-w-[320px] text-12 text-meta">Approve within about a minute, or your wallet will expire the request and you&apos;ll need to slide again.</p>
        )}
      </div>
    </div>
  );
}
