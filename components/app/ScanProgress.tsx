"use client";

/**
 * Scan progress as a step pipeline: a header naming the wallet, then each
 * network step with a status mark, a connecting rail and its real elapsed
 * time. Times are measured from actual phase changes, never simulated.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ScanSearch } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ScanPhase, ScanProgress as Progress } from "@/lib/scan";
import { shortAddress } from "@/lib/format";

const STEPS: { phase: ScanPhase; label: string }[] = [
  { phase: "token", label: "SPL Token accounts" },
  { phase: "token2022", label: "Token-2022 accounts" },
  { phase: "mints", label: "Token mints" },
  { phase: "market", label: "Prices and names" },
];

const ORDER: ScanPhase[] = ["token", "token2022", "mints", "market", "done"];
const ease = [0.16, 1, 0.3, 1] as const;

const fmt = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`);

function Mark({ state }: { state: "done" | "active" | "pending" }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-base">
      <AnimatePresence mode="wait" initial={false}>
        {state === "done" ? (
          <motion.span
            key="done"
            className="flex size-5 items-center justify-center rounded-full bg-hi text-base"
            initial={reduce ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <Check size={12} strokeWidth={2.5} aria-hidden />
          </motion.span>
        ) : state === "active" ? (
          <motion.span
            key="active"
            className="size-5 rounded-full border-2 border-line border-t-accent motion-safe:animate-spin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        ) : (
          <motion.span key="pending" className="size-5 rounded-full border border-line-hover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        )}
      </AnimatePresence>
    </span>
  );
}

export function ScanProgress({ progress, address }: { progress: Progress; address?: string }) {
  // Real timings: record when each phase starts.
  const started = useRef<Partial<Record<ScanPhase, number>>>({});
  const [now, setNow] = useState(() => Date.now());

  if (started.current[progress.phase] === undefined) started.current[progress.phase] = Date.now();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  const activeIdx = ORDER.indexOf(progress.phase);
  const elapsed = (i: number): number | null => {
    const step = STEPS[i];
    if (!step) return null;
    const start = started.current[step.phase];
    if (start === undefined) return null;
    const next = ORDER.slice(i + 1)
      .map((p) => started.current[p])
      .find((t) => t !== undefined);
    return (next ?? now) - start;
  };

  return (
    <div
      className="rounded-2xl border border-line bg-raised p-3 shadow-[0_8px_24px_rgb(20_22_27/0.05)]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress.fraction * 100)}
      aria-valuetext={progress.label}
    >
      {/* Header: what is being scanned */}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-base px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-overlay text-hi">
          <ScanSearch size={16} strokeWidth={1.5} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-14 font-medium text-hi">Scanning wallet</p>
          {address && <p className="truncate font-mono text-12 text-meta">{shortAddress(address, 6)}</p>}
        </div>
        <span className="font-mono text-12 text-meta tnum">{Math.round(progress.fraction * 100)}%</span>
      </div>

      {/* Steps */}
      <ol className="relative mt-2 rounded-xl border border-line bg-base px-4 py-2">
        {STEPS.map((s, i) => {
          const state = activeIdx > i ? "done" : activeIdx === i ? "active" : "pending";
          const ms = elapsed(i);
          const last = i === STEPS.length - 1;
          return (
            <li key={s.phase} className="relative flex items-center gap-3 py-2.5">
              {/* Rail to the next step, filled once this step is done */}
              {!last && (
                <span aria-hidden className="absolute left-[9.5px] top-[30px] h-[calc(100%-20px)] w-px bg-line">
                  <motion.span
                    className="absolute inset-0 origin-top bg-hi"
                    initial={false}
                    animate={{ scaleY: state === "done" ? 1 : 0 }}
                    transition={{ duration: 0.4, ease }}
                  />
                </span>
              )}
              <Mark state={state} />
              <span className={`flex-1 text-14 transition-colors ${state === "pending" ? "text-meta" : "text-hi"}`}>
                {s.label}
                {state === "done" && <span className="sr-only"> (done)</span>}
              </span>
              <span className="font-mono text-12 text-meta tnum">{state === "pending" || ms === null ? "—" : fmt(ms)}</span>
            </li>
          );
        })}
      </ol>

      {/* Live status line */}
      <p className="px-4 pb-1 pt-3 text-12 text-meta" aria-live="polite">
        {progress.label}…
      </p>
    </div>
  );
}
