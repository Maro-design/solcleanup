/**
 * The ledger: an itemised money breakdown with dotted leaders and a ruled
 * total. Used everywhere SolCleanup shows what a user pays or receives.
 */
import type { ReactNode } from "react";

export interface LedgerRow {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "muted" | "deduct";
}

export function Ledger({
  rows,
  total,
  className = "",
}: {
  rows: LedgerRow[];
  total: { label: ReactNode; value: ReactNode };
  className?: string;
}) {
  return (
    <dl className={`font-mono text-14 ${className}`}>
      {rows.map((r, i) => (
        <div key={i} className="flex items-baseline py-1">
          <dt className={r.tone === "muted" ? "text-meta" : "text-mid"}>{r.label}</dt>
          <span className="leader" aria-hidden />
          <dd className={`tnum text-right ${r.tone === "deduct" ? "text-mid" : r.tone === "muted" ? "text-meta" : "text-hi"}`}>
            {r.value}
          </dd>
        </div>
      ))}
      <div className="mt-2 flex items-baseline border-t border-line pt-3">
        <dt className="text-hi">{total.label}</dt>
        <span className="leader opacity-0" aria-hidden />
        <dd className="tnum text-right text-accent-ink">{total.value}</dd>
      </div>
    </dl>
  );
}
