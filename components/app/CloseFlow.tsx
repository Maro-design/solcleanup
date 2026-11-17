"use client";

/**
 * Every modal in the close flow: checking, pre-flight block, review (the fee
 * breakdown and instruction summary shown before any signature), live batch
 * progress, and errors. The result screen lives in ResultView.
 */
import { motion } from "framer-motion";
import { AlertTriangle, Check, ExternalLink, Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { solscanTx } from "@/lib/config";
import { formatAmount, formatSol, formatUsd, plural, shortAddress } from "@/lib/format";
import type { CloseState } from "@/hooks/useClose";
import { BurnConfirm } from "./BurnConfirm";
import type { Plan } from "@/lib/close";

interface Props {
  state: CloseState;
  owner: string;
  solPriceUsd: number | null;
  onConfirm: (plan: Plan) => void;
  onCancel: () => void;
  onDeselect: (addresses: string[]) => void;
}

export function CloseFlow({ state, owner, solPriceUsd, onConfirm, onCancel, onDeselect }: Props) {
  return (
    <>
      <Modal open={state.status === "checking"} title="Preparing" dismissible={false}>
        {state.status === "checking" && (
          <p className="flex items-center gap-3 text-14 text-mid" aria-live="polite">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-hi motion-reduce:animate-none" aria-hidden />
            {state.label}
          </p>
        )}
      </Modal>

      <Modal
        open={state.status === "blocked"}
        onClose={onCancel}
        title="Some selected accounts changed"
        description="Their on-chain state changed since the scan, so nothing will be signed until these are removed."
      >
        {state.status === "blocked" && (
          <>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {state.offenders.map((o) => (
                <li key={o.account.address} className="flex items-start gap-3 p-4">
                  <AlertTriangle size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-warn" aria-hidden />
                  <div className="min-w-0 text-14">
                    <p className="text-hi">
                      {o.account.symbol || shortAddress(o.account.mint)}
                      {o.uiAmount > 0 && <span className="ml-2 font-mono text-mid tnum">{formatAmount(o.uiAmount)}</span>}
                      {o.valueUsd !== null && o.valueUsd > 0 && <span className="ml-2 font-mono text-warn tnum">{formatUsd(o.valueUsd)}</span>}
                    </p>
                    <p className="text-mid">{o.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onDeselect(state.offenders.map((o) => o.account.address));
                  onCancel();
                }}
              >
                Remove {plural(state.offenders.length, "account")} from selection
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={state.status === "review"} onClose={onCancel} title="Burn tokens?" bare>
        {state.status === "review" && <BurnConfirm plan={state.plan} onConfirm={onConfirm} onCancel={onCancel} />}
      </Modal>

      <Modal open={state.status === "executing"} title="Closing accounts" dismissible={false}>
        {state.status === "executing" && <Executing state={state} />}
      </Modal>

      <Modal
        open={state.status === "error"}
        onClose={onCancel}
        title={state.status === "error" && state.rejected ? "Request rejected" : "That didn't go through"}
      >
        {state.status === "error" && (
          <>
            <p className="text-14 text-mid">{state.message}.</p>
            <div className="mt-6 flex justify-end">
              <Button onClick={onCancel}>Back to accounts</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function Executing({ state }: { state: Extract<CloseState, { status: "executing" }> }) {
  const p = state.progress;
  const fraction = p.batchCount === 0 ? 0 : p.outcomes.length / p.batchCount;
  const headline =
    p.phase === "preparing"
      ? "Getting your transaction ready"
      : p.phase === "signing"
        ? "Waiting for your wallet"
        : `Batch ${Math.min(p.batchIndex, p.batchCount)} of ${p.batchCount}`;

  const t = state.plan.totals;
  const sent = p.outcomes.length > 0;

  return (
    <div aria-live="polite">
      <p className="text-16 text-hi">{headline}</p>
      {sent ? (
        <p className="mt-1 font-mono text-14 text-mid tnum">
          {plural(p.closedAccounts, "account")} closed · <span className="text-accent-ink">{formatSol(p.recoveredLamports)} SOL</span> claimed of{" "}
          {formatSol(t.netLamports)}
        </p>
      ) : (
        <p className="mt-1 text-14 text-mid">
          You&apos;ll receive <span className="font-mono text-accent-ink tnum">{formatSol(t.netLamports)} SOL</span> from{" "}
          {plural(t.accounts, "account")} once you approve.
        </p>
      )}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-overlay" role="progressbar" aria-valuemin={0} aria-valuemax={p.batchCount} aria-valuenow={p.outcomes.length}>
        <motion.div className="h-full origin-left rounded-full bg-accent" animate={{ scaleX: fraction }} transition={{ type: "spring", stiffness: 260, damping: 30 }} />
      </div>
      {p.outcomes.length > 0 && (
        <ul className="mt-4 space-y-1 font-mono text-12">
          {p.outcomes.map((o) => (
            <li key={o.index} className="flex items-center gap-2">
              {o.ok ? <Check size={12} strokeWidth={1.5} className="text-accent-ink" aria-hidden /> : <X size={12} strokeWidth={1.5} className="text-danger" aria-hidden />}
              <span className="text-mid">Tx {o.index + 1}</span>
              {o.signature && (
                <a href={solscanTx(o.signature)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-meta hover:text-mid">
                  {shortAddress(o.signature, 6)} <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {p.phase === "signing" && <p className="mt-4 text-12 text-meta">Approve the request in your wallet. Closing this page now is safe; nothing is sent until you approve.</p>}
    </div>
  );
}
