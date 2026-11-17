"use client";

/**
 * Close flow state machine:
 *   idle → checking (pre-flight re-read + simulation) → blocked
 *        | review (only when dust will be burned) → executing → done
 *        | executing → done (plain closes go straight to the wallet)
 * Any wallet rejection or RPC failure lands in `error` with a plain message.
 */
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import {
  executePlan,
  planClose,
  preflightCheck,
  type BatchOutcome,
  type ExecutionProgress,
  type Plan,
  type PreflightOffender,
} from "@/lib/close";
import type { ScannedAccount } from "@/lib/scan";
import { decodeError, isUserRejection } from "@/lib/errors";
import { reportReferredClaims, resolveReferrer, storedReferralCode } from "@/lib/referral";

export type CloseState =
  | { status: "idle" }
  | { status: "checking"; label: string }
  | { status: "blocked"; offenders: PreflightOffender[] }
  | { status: "review"; plan: Plan }
  | { status: "executing"; plan: Plan; progress: ExecutionProgress }
  | { status: "done"; plan: Plan; outcomes: BatchOutcome[] }
  | { status: "error"; message: string; rejected: boolean };

export function useClose() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [state, setState] = useState<CloseState>({ status: "idle" });

  const reset = useCallback(() => setState({ status: "idle" }), []);

  /** Sign and send the batches that passed simulation. */
  const execute = useCallback(
    async (plan: Plan) => {
      if (!publicKey) return;
      try {
        const outcomes = await executePlan(
          connection,
          { publicKey, signTransaction, signAllTransactions },
          plan,
          (progress) => setState({ status: "executing", plan, progress }),
        );
        setState({ status: "done", plan, outcomes });
        // Referred claims: let the server verify them on-chain for the referrer's stats.
        const code = storedReferralCode();
        if (code && plan.ready.some((b) => b.referrer && b.referralLamports > 0)) {
          reportReferredClaims(outcomes.flatMap((o) => (o.ok ? [o.signature] : [])), code);
        }
      } catch (e) {
        const rejected = isUserRejection(e);
        setState({
          status: "error",
          rejected,
          message: rejected ? "You rejected the request in your wallet. Nothing was sent and no fee was taken" : decodeError(e),
        });
      }
    },
    [connection, publicKey, signTransaction, signAllTransactions],
  );

  /**
   * Pre-flight check, then build + simulate every batch. Plain closes go
   * straight to the wallet; if any dust will be burned, stop at `review` so
   * the user confirms the burn first.
   */
  const prepare = useCallback(
    async (accounts: ScannedAccount[]) => {
      if (!publicKey) return;
      try {
        setState({ status: "checking", label: "Re-checking selected accounts on-chain" });
        const offenders = await preflightCheck(connection, publicKey, accounts);
        if (offenders.length > 0) {
          setState({ status: "blocked", offenders });
          return;
        }
        setState({ status: "checking", label: "Simulating transactions" });
        const code = storedReferralCode();
        const referrer = code ? await resolveReferrer(code) : null;
        const plan = await planClose(
          connection,
          publicKey,
          accounts,
          (done, total) => setState({ status: "checking", label: `Simulating transaction ${done} of ${total}` }),
          referrer ?? undefined,
        );
        if (plan.ready.length === 0) {
          const reason = plan.batches.find((b) => b.simulationError)?.simulationError ?? "No transaction passed simulation";
          setState({ status: "error", message: `${reason}. Nothing was sent to your wallet`, rejected: false });
          return;
        }
        if (plan.ready.some((b) => b.accounts.some((a) => a.burn))) {
          setState({ status: "review", plan });
          return;
        }
        await execute(plan);
      } catch (e) {
        setState({ status: "error", message: decodeError(e), rejected: false });
      }
    },
    [connection, publicKey, execute],
  );

  return { state, prepare, execute, reset };
}
