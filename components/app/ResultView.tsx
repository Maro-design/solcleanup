"use client";

/**
 * Result screen. One beat: the recovered figure springs in and a single
 * accent wash passes over it. Then the facts — fee, net, every signature.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Check, ExternalLink, RotateCw, X } from "lucide-react";
import { Ledger } from "@/components/ui/Ledger";
import { Button } from "@/components/ui/Button";
import { FEE_PERCENT_LABEL, solscanTx } from "@/lib/config";
import { formatSol, formatUsd, plural, shortAddress } from "@/lib/format";
import type { BatchOutcome, Plan } from "@/lib/close";

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
  const reduce = useReducedMotion();
  const ok = outcomes.filter((o) => o.ok);
  const failed = outcomes.filter((o) => !o.ok);
  const gross = ok.reduce((s, o) => s + o.rentLamports, 0);
  const fee = ok.reduce((s, o) => s + o.feeLamports, 0);
  const network = plan.ready.filter((b) => ok.some((o) => o.index === b.index)).reduce((s, b) => s + b.networkFeeLamports, 0);
  const net = gross - fee - network;
  const closed = ok.reduce((s, o) => s + o.accounts, 0);
  const allFailed = ok.length === 0;

  return (
    <section aria-labelledby="result-title" className="rounded-2xl border border-line bg-raised p-6 sm:p-10">
      <h1 id="result-title" className="text-16 text-mid">
        {allFailed ? "No accounts were closed" : failed.length > 0 ? "Partly complete" : "Done"}
      </h1>

      {!allFailed && (
        <div className="relative mt-4 inline-block overflow-hidden rounded-lg">
          <motion.p
            className="display font-mono text-48 font-medium text-accent-ink tnum sm:text-72"
            initial={reduce ? false : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            +{formatSol(net)} SOL
          </motion.p>
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgb(100_149_237/0.25),transparent)]"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
            />
          )}
        </div>
      )}
      {!allFailed && solPriceUsd && <p className="mt-1 font-mono text-14 text-meta tnum">≈ {formatUsd((net / 1e9) * solPriceUsd)} received in your wallet</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <Ledger
            rows={[
              { label: `${plural(closed, "account")} closed`, value: `${formatSol(gross)} SOL` },
              { label: `Service fee (${FEE_PERCENT_LABEL})`, value: `−${formatSol(fee)} SOL`, tone: "deduct" },
              { label: "Network fee (est.)", value: `−${formatSol(network)} SOL`, tone: "deduct" },
            ]}
            total={{ label: "Net received", value: `${formatSol(net)} SOL` }}
          />
        </div>

        <div>
          <h2 className="text-14 text-mid">Transactions</h2>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line text-14">
            {outcomes.map((o) => (
              <li key={o.index} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                {o.ok ? <Check size={16} strokeWidth={1.5} className="text-accent-ink" aria-label="Succeeded" /> : <X size={16} strokeWidth={1.5} className="text-danger" aria-label="Failed" />}
                <span className="text-mid">
                  Tx {o.index + 1} · {plural(o.accounts, "account")}
                </span>
                {o.signature ? (
                  <a
                    href={solscanTx(o.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 rounded font-mono text-12 text-mid hover:text-hi"
                  >
                    {shortAddress(o.signature, 6)}
                    <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
                    <span className="sr-only">(view on Solscan)</span>
                  </a>
                ) : (
                  <span className="ml-auto font-mono text-12 text-meta">not sent</span>
                )}
                {!o.ok && <p className="w-full pl-7 text-12 text-meta">{o.error}. No fee was taken for this transaction.</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button variant={allFailed ? "primary" : "secondary"} onClick={onRescan}>
          <RotateCw size={16} strokeWidth={1.5} aria-hidden />
          {failed.length > 0 ? "Rescan and retry" : "Rescan wallet"}
        </Button>
        {failed.length > 0 && <p className="text-14 text-mid">{plural(failed.length, "transaction")} didn't complete. Rescanning picks up any accounts still open.</p>}
      </div>
    </section>
  );
}
