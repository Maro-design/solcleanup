"use client";

/**
 * Dense, sortable, paginated account table. Only empty, unprotected rows have
 * an enabled checkbox; everything else shows why it is untouchable.
 */
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import type { ScannedAccount } from "@/lib/scan";
import { formatAmount, formatSol, formatUsd, shortAddress } from "@/lib/format";
import { solscanAccount } from "@/lib/config";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TokenLogo } from "@/components/ui/TokenLogo";

export type SortKey = "token" | "balance" | "value" | "rent" | "status";
export interface Sort {
  key: SortKey;
  dir: "asc" | "desc";
}

interface Props {
  rows: ScannedAccount[];
  selected: Set<string>;
  onToggle: (address: string) => void;
  onTogglePage: (select: boolean) => void;
  sort: Sort;
  onSort: (key: SortKey) => void;
  /** Changes on each scan so rows stagger in once per scan. */
  animationKey: string;
  disabled?: boolean;
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  k: SortKey;
  sort: Sort;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort.key === k;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={`h-10 px-3 font-normal ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 rounded-md text-12 transition-colors ${active ? "text-hi" : "text-meta hover:text-mid"} ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        {label}
        <span className="inline-flex w-3" aria-hidden>
          {active && (sort.dir === "asc" ? <ArrowUp size={12} strokeWidth={1.5} /> : <ArrowDown size={12} strokeWidth={1.5} />)}
        </span>
      </button>
    </th>
  );
}

export function AccountTable({ rows, selected, onToggle, onTogglePage, sort, onSort, animationKey, disabled }: Props) {
  const reduce = useReducedMotion();
  const selectableOnPage = rows.filter((r) => r.closable && r.status !== "protected");
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((r) => selected.has(r.address));
  const someOnPageSelected = selectableOnPage.some((r) => selected.has(r.address));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-raised">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-14" aria-label="Token accounts">
          <thead className="border-b border-line">
            <tr>
              <th scope="col" className="h-10 w-12 pl-4 pr-1 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all closable accounts on this page"
                  className="size-4 cursor-pointer accent-[var(--text-hi)] disabled:cursor-not-allowed"
                  checked={allOnPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
                  }}
                  disabled={disabled || selectableOnPage.length === 0}
                  onChange={(e) => onTogglePage(e.target.checked)}
                />
              </th>
              <SortHeader label="Token" k="token" sort={sort} onSort={onSort} />
              <SortHeader label="Balance" k="balance" sort={sort} onSort={onSort} align="right" className="hidden md:table-cell" />
              <SortHeader label="Value" k="value" sort={sort} onSort={onSort} align="right" className="hidden md:table-cell" />
              <SortHeader label="Rent" k="rent" sort={sort} onSort={onSort} align="right" />
              <SortHeader label="Status" k="status" sort={sort} onSort={onSort} className="hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const isSelected = selected.has(a.address);
              const label = a.symbol || shortAddress(a.mint);
              return (
                <motion.tr
                  key={`${animationKey}-${a.address}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(i, 30) * 0.025 }}
                  className={`border-b border-line last:border-b-0 transition-colors ${isSelected ? "bg-[rgb(100_149_237/0.07)]" : "hover:bg-overlay/60"}`}
                >
                  <td className="relative h-12 w-12 pl-4 pr-1">
                    <motion.span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-0.5 origin-center bg-accent"
                      initial={false}
                      animate={{ scaleY: isSelected ? 1 : 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 30 }}
                    />
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer accent-[var(--text-hi)] disabled:cursor-not-allowed disabled:opacity-30"
                      checked={isSelected}
                      disabled={disabled || !a.closable}
                      onChange={() => onToggle(a.address)}
                      aria-label={a.status === "protected" && a.closable ? `Select ${label} to burn and close (protected: ${a.reasons.join(", ")})` : a.burn ? `Select ${label} to burn the dust and close` : a.closable ? `Select ${label} account for closing` : `${label} — cannot be closed: ${a.reasons.join(", ")}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <TokenLogo src={a.logo} label={label} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-hi">{label}</span>
                          {a.program === "token2022" && <span className="font-mono text-12 text-meta">2022</span>}
                        </div>
                        <a
                          href={solscanAccount(a.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1 rounded font-mono text-12 text-meta hover:text-mid"
                        >
                          {shortAddress(a.address)}
                          <ExternalLink size={12} strokeWidth={1.5} className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                          <span className="sr-only">(opens Solscan)</span>
                        </a>
                        {a.status !== "empty" && a.reasons.length > 0 && (
                          <p className="mt-0.5 truncate text-12 text-meta sm:hidden">{a.reasons[0]}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 text-right font-mono text-mid tnum md:table-cell">{formatAmount(a.uiAmount)}</td>
                  <td className="hidden px-3 text-right font-mono text-mid tnum md:table-cell">
                    {a.status === "empty" ? <span className="text-meta">—</span> : formatUsd(a.valueUsd)}
                  </td>
                  <td className={`px-3 text-right font-mono tnum ${a.closable ? "text-hi" : "text-meta"}`}>{formatSol(a.lamports, 5)}</td>
                  <td className="hidden px-3 pr-4 sm:table-cell">
                    <StatusBadge status={a.status} />
                    {a.status !== "empty" && a.reasons[0] && (
                      <p className="max-w-[220px] truncate text-12 text-meta" title={a.reasons.join(" · ")}>
                        {a.reasons[0]}
                      </p>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
