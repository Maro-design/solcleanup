"use client";

/**
 * Every modal in the close flow: checking, pre-flight block, review (the fee
 * breakdown and instruction summary shown before any signature), live batch
 * progress, and errors. The result screen lives in ResultView.
 */
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatAmount, formatUsd, plural, shortAddress } from "@/lib/format";
import type { CloseState } from "@/hooks/useClose";
import { BurnConfirm } from "./BurnConfirm";
import { ExecutingCard } from "./ExecutingCard";
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

      <Modal open={state.status === "executing"} title="Claiming your SOL" dismissible={false} bare>
        {state.status === "executing" && <ExecutingCard progress={state.progress} plan={state.plan} />}
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
