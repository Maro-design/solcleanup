"use client";

/**
 * Shown only when the selection includes dust: the one question that matters
 * before the wallet opens — "burn these tokens?". Plain closes skip it.
 */
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Flame } from "lucide-react";
import type { Plan } from "@/lib/close";
import { formatAmount, formatSol, formatUsd, plural, shortAddress } from "@/lib/format";
import { TokenLogo } from "@/components/ui/TokenLogo";

const SHOW = 6;

export function BurnConfirm({ plan, onConfirm, onCancel }: { plan: Plan; onConfirm: (plan: Plan) => void; onCancel: () => void }) {
  const reduce = useReducedMotion();
  const burns = plan.ready.flatMap((b) => b.accounts.filter((a) => a.burn));
  const closes = plan.totals.accounts;
  const burnedUsd = burns.reduce((s, a) => s + (a.valueUsd ?? 0), 0);
  // Protected picks first: they are the ones worth a second look.
  const ordered = [...burns].sort((a, b) => Number(b.status === "protected") - Number(a.status === "protected"));
  const shown = ordered.slice(0, SHOW);
  const more = burns.length - shown.length;
  const protectedCount = burns.filter((a) => a.status === "protected").length;
  const unpriced = burns.some((a) => a.valueUsd === null && a.kind === "token");
  const cnfts = burns.filter((a) => a.kind === "cnft").length;

  return (
    <div className="relative overflow-hidden rounded-t-3xl border border-line bg-raised shadow-[0_40px_80px_-24px_rgb(var(--shadow-ink)/0.45),0_0_0_1px_rgb(227_112_43/0.06)] sm:rounded-3xl">
      {/* Warm glow behind the icon */}
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(240_140_60/0.28),transparent_65%)]" />

      <div className="relative px-6 pb-6 pt-8 text-center sm:px-8">
        <div className="relative mx-auto flex size-16 items-center justify-center">
          {!reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl border border-[rgb(227_112_43/0.45)]"
              animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-[linear-gradient(160deg,#ffb36b,#e3702b)] text-white shadow-[0_12px_28px_-8px_rgb(227_112_43/0.7),inset_0_1px_0_rgb(255_255_255/0.4)]">
            <Flame size={28} strokeWidth={2} aria-hidden />
          </span>
        </div>

        <p className="heading mt-6 text-20 font-medium text-hi">
          Burn {plural(burns.length, burns.some((a) => a.kind !== "token") ? "item" : "token")}?
        </p>
        <p className="mx-auto mt-2 max-w-[340px] text-14 text-mid">
          These tokens are worth about <span className="text-hi">{formatUsd(burnedUsd)}</span>
          {unpriced ? " plus some with no known price" : ""}. Burning them can&apos;t be undone, and it lets their accounts close so the
          rent comes back to you.
        </p>
        {cnfts > 0 && (
          <p className="mx-auto mt-3 max-w-[360px] text-12 text-meta">
            {plural(cnfts, "compressed NFT")} hold no rent, so burning {cnfts === 1 ? "it" : "them"} returns no SOL and costs only the network fee.
          </p>
        )}
        {protectedCount > 0 && (
          <p className="mx-auto mt-4 max-w-[360px] rounded-xl border border-[rgb(185_58_38/0.3)] bg-[rgb(185_58_38/0.08)] px-3 py-2 text-12 text-danger">
            {plural(protectedCount, "protected token")} included. Check {protectedCount === 1 ? "it" : "them"} below before you burn.
          </p>
        )}
      </div>

      <ul className="relative mx-4 max-h-[264px] divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-base sm:mx-6">
        {shown.map((a, i) => {
          const label = a.symbol || shortAddress(a.mint);
          return (
            <motion.li
              key={a.address}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <TokenLogo src={a.logo} label={label} size={28} />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-14 text-hi">{label}</p>
                <p className="truncate font-mono text-12 text-meta tnum">
                  {formatAmount(a.uiAmount)}
                  {a.status === "protected" && a.reasons[0] && <span className="font-sans text-danger"> · {a.reasons[0]}</span>}
                </p>
              </div>
              <span className={`font-mono text-12 tnum ${a.status === "protected" ? "text-danger" : "text-warn"}`}>
                {a.kind === "nft" ? `+${formatSol(a.lamports, 4)} SOL` : a.kind === "cnft" ? "cNFT" : a.valueUsd === null ? "No price" : formatUsd(a.valueUsd)}
              </span>
            </motion.li>
          );
        })}
        {more > 0 && <li className="px-4 py-3 text-center text-12 text-meta">and {more.toLocaleString("en-US")} more</li>}
      </ul>

      <p className="relative mx-6 mt-4 text-center text-12 text-meta sm:mx-8">
        {plural(closes, "account")} close in total. You get <span className="font-mono text-accent-ink tnum">{formatSol(plan.totals.netLamports)} SOL</span>.
      </p>

      <div className="relative mt-6 flex flex-col-reverse gap-2 border-t border-line bg-overlay/40 p-4 sm:flex-row sm:p-6">
        <button
          type="button"
          onClick={onCancel}
          className="lift inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line bg-raised text-14 font-medium text-hi"
        >
          Keep my tokens
        </button>
        <button
          type="button"
          onClick={() => onConfirm(plan)}
          className="group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(160deg,#e07a36,#b9501a)] text-14 font-medium text-white shadow-[0_10px_24px_-10px_rgb(227_112_43/0.8),inset_0_1px_0_rgb(255_255_255/0.3)] transition-[filter,transform] hover:brightness-105 active:translate-y-px"
        >
          Burn and claim
          <ArrowRight size={16} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
