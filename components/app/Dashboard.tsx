"use client";

/**
 * The post-connect dashboard: scan, summary, filterable table, sticky action
 * bar, and the close flow. Selection defaults to empty accounts only.
 */
import { useConnection } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronLeft, ChevronRight, Flame, Layers, ListChecks, RotateCw, Wallet, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useScan } from "@/hooks/useScan";
import { useClose } from "@/hooks/useClose";
import { computeTotals, type ScannedAccount } from "@/lib/scan";
import { makeBatches } from "@/lib/close";
import { LAMPORTS_PER_SIGNATURE, PAGE_SIZE } from "@/lib/config";
import { formatSol, formatUsd, plural, shortAddress } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";

/** Summary card: icon tile, label, big number, footnote. `hero` gets the cornflower treatment. */
function StatCard({ icon: Icon, label, children, foot, hero = false }: { icon: LucideIcon; label: string; children: ReactNode; foot: ReactNode; hero?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 shadow-[0_1px_0_rgb(255_255_255/0.04)_inset,0_18px_40px_-24px_rgb(var(--shadow-ink)/0.45)] ${
        hero ? "border-[rgb(100_149_237/0.35)] bg-raised" : "border-line bg-raised"
      }`}
    >
      {hero && <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-accent opacity-[0.14] blur-3xl" />}
      <div className="relative flex items-center gap-3">
        <span
          className={`flex size-9 items-center justify-center rounded-xl border ${
            hero ? "border-[rgb(100_149_237/0.4)] bg-[rgb(100_149_237/0.16)] text-accent-ink" : "border-line bg-overlay text-hi"
          }`}
        >
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-14 text-mid">{label}</p>
      </div>
      <div className="relative mt-5">{children}</div>
      <p className="relative mt-2 text-12 text-meta tnum">{foot}</p>
    </div>
  );
}
import { ScanProgress } from "./ScanProgress";
import { AccountTable, type Sort, type SortKey } from "./AccountTable";
import { CloseFlow } from "./CloseFlow";
import { ResultView } from "./ResultView";

type Filter = "all" | "empty" | "dust" | "protected" | "nfts" | "cnfts";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "empty", label: "Empty" },
  { key: "dust", label: "Dust" },
  { key: "protected", label: "Protected" },
  { key: "nfts", label: "NFTs" },
  { key: "cnfts", label: "cNFTs" },
];

/** NFTs and cNFTs get their own tabs; Protected lists the remaining protected tokens. */
const matches = (a: ScannedAccount, f: Filter) =>
  f === "all"
    ? true
    : f === "nfts"
      ? a.kind === "nft"
      : f === "cnfts"
        ? a.kind === "cnft"
        : f === "protected"
          ? a.status === "protected" && a.kind === "token"
          : a.status === f;

const statusRank = { empty: 0, dust: 1, protected: 2 } as const;

function sortRows(rows: ScannedAccount[], sort: Sort): ScannedAccount[] {
  const dir = sort.dir === "asc" ? 1 : -1;
  const by: Record<SortKey, (a: ScannedAccount, b: ScannedAccount) => number> = {
    token: (a, b) => (a.symbol || a.mint).localeCompare(b.symbol || b.mint),
    balance: (a, b) => a.uiAmount - b.uiAmount,
    value: (a, b) => (a.valueUsd ?? -1) - (b.valueUsd ?? -1),
    rent: (a, b) => a.lamports - b.lamports,
    status: (a, b) => statusRank[a.status] - statusRank[b.status],
  };
  return [...rows].sort((a, b) => by[sort.key](a, b) * dir || b.lamports - a.lamports);
}

const fmtSol = (n: number) => formatSol(n);

/**
 * `readOnly` (development preview via /app?watch=) renders the full dashboard
 * for any address with closing disabled.
 */
export function Dashboard({ owner: ownerKey, readOnly = false }: { owner: PublicKey; readOnly?: boolean }) {
  const publicKey = ownerKey;
  const { connection } = useConnection();
  const { state: scanState, scan } = useScan(publicKey);
  const close = useClose();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>({ key: "status", dir: "asc" });
  const [page, setPage] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);

  const result = scanState.status === "done" ? scanState.result : null;
  const accounts = useMemo(() => result?.accounts ?? [], [result]);

  // Default selection: empty, unprotected accounts only. Dust burns are opt-in.
  useEffect(() => {
    if (!result) return;
    setSelected(new Set(result.accounts.filter((a) => a.status === "empty").map((a) => a.address)));
    setFilter(result.totals.closable > 0 ? "empty" : "all");
    setPage(0);
  }, [result]);

  // Wallet SOL balance, for the "insufficient SOL for network fees" state.
  useEffect(() => {
    if (!publicKey || !result) return;
    let live = true;
    connection
      .getBalance(publicKey, "confirmed")
      .then((b) => live && setBalance(b))
      .catch(() => live && setBalance(null));
    return () => {
      live = false;
    };
  }, [connection, publicKey, result]);

  const filtered = useMemo(() => sortRows(accounts.filter((a) => matches(a, filter)), sort), [accounts, filter, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: accounts.length, empty: 0, dust: 0, protected: 0, nfts: 0, cnfts: 0 };
    for (const a of accounts) {
      if (a.kind === "nft") c.nfts++;
      else if (a.kind === "cnft") c.cnfts++;
      else if (a.status === "empty") c.empty++;
      else if (a.status === "dust") c.dust++;
      else c.protected++;
    }
    return c;
  }, [accounts]);

  const selection = useMemo(() => computeTotals(accounts, selected), [accounts, selected]);
  const selectedAccounts = useMemo(() => accounts.filter((a) => a.closable && selected.has(a.address)), [accounts, selected]);
  const batchCount = useMemo(() => makeBatches(selectedAccounts).length, [selectedAccounts]);
  // Rough lower bound before simulation: one signature per batch.
  const minNetworkFee = batchCount * LAMPORTS_PER_SIGNATURE;
  const insufficientSol = balance !== null && selection.closable > 0 && balance < LAMPORTS_PER_SIGNATURE * 2;

  const toggle = useCallback((address: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const togglePage = useCallback(
    (select: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        // Protected rows are never bulk-selected; they must be ticked one by one.
        for (const r of pageRows) if (r.closable && (r.status !== "protected" || !select)) select ? next.add(r.address) : next.delete(r.address);
        return next;
      });
    },
    [pageRows],
  );

  const onSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "token" ? "asc" : "desc" }));

  const busy = close.state.status !== "idle" && close.state.status !== "done" && close.state.status !== "error";
  const rescan = () => {
    close.reset();
    void scan();
  };

  const owner = publicKey.toBase58();

  // --- Result screen replaces the table after execution -------------------
  if (close.state.status === "done") {
    return (
      <div className="pt-8">
        <ResultView outcomes={close.state.outcomes} plan={close.state.plan} solPriceUsd={result?.solPriceUsd ?? null} onRescan={rescan} />
      </div>
    );
  }

  return (
    <div className="pt-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading text-32 font-medium text-hi">Token accounts</h1>
          <p className="mt-2 font-mono text-14 text-mid">
            {shortAddress(owner, 6)}
            {result && <span className="text-meta"> · scanned {new Date(result.scannedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </p>
        </div>
        <Button onClick={() => void scan()} disabled={scanState.status === "scanning" || busy}>
          <RotateCw size={16} strokeWidth={1.5} className={scanState.status === "scanning" ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden />
          Rescan
        </Button>
      </div>

      {/* Scan / error states */}
      <div className="mt-8" aria-live="polite">
        {scanState.status === "scanning" && <ScanProgress progress={scanState.progress} address={owner} />}
        {scanState.status === "error" && (
          <div role="alert" className="flex flex-col gap-4 rounded-2xl border border-line bg-raised p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertTriangle size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-danger" aria-hidden />
              <div>
                <p className="text-16 text-hi">The scan didn't finish</p>
                <p className="text-14 text-mid">{scanState.message}.</p>
              </div>
            </div>
            <Button onClick={() => void scan()}>Try again</Button>
          </div>
        )}
      </div>

      {result && (
        <>
          {/* Summary */}
          <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr]">
            {/* What the user walks away with, already net of the fee. */}
            <div className="sm:col-span-2 lg:col-span-1">
              <StatCard
                hero
                icon={Wallet}
                label="You'll receive"
                foot={
                  <>
                    {result.solPriceUsd ? `≈ ${formatUsd((Math.max(0, selection.netLamports - minNetworkFee) / 1e9) * result.solPriceUsd)}` : ""}
                  </>
                }
              >
                <p className="font-mono text-48 leading-none text-accent-ink">
                  <AnimatedNumber value={Math.max(0, selection.netLamports - minNetworkFee)} format={fmtSol} />
                  <span className="ml-2 text-16 text-accent-dim">SOL</span>
                </p>
              </StatCard>
            </div>
            <StatCard
              icon={ListChecks}
              label="Selected to close"
              foot={
                <>
                  {formatSol(selection.reclaimableLamports)} SOL rent
                  {selection.burns > 0 ? ` · ${plural(selection.burns, "burn")}` : ""}
                </>
              }
            >
              <p className="font-mono text-32 leading-none text-hi">
                <AnimatedNumber value={selection.closable} format={(n) => Math.round(n).toLocaleString("en-US")} />
              </p>
            </StatCard>
            <StatCard
              icon={Layers}
              label="Accounts found"
              foot={
                <>
                  {counts.empty.toLocaleString("en-US")} empty · {counts.dust.toLocaleString("en-US")} dust · {counts.protected.toLocaleString("en-US")} protected{counts.nfts + counts.cnfts > 0 ? ` · ${(counts.nfts + counts.cnfts).toLocaleString("en-US")} NFTs` : ""}
                </>
              }
            >
              <p className="font-mono text-32 leading-none text-hi">
                <AnimatedNumber value={result.totals.accounts} format={(n) => Math.round(n).toLocaleString("en-US")} />
              </p>
            </StatCard>
          </section>

          {/* Empty-state messaging */}
          {result.totals.accounts === 0 && (
            <div className="mt-8 rounded-2xl border border-line bg-raised p-8 text-center">
              <p className="text-16 text-hi">This wallet has no token accounts</p>
              <p className="mt-2 text-14 text-mid">There's nothing locked in rent here. Every SPL and Token-2022 account was checked.</p>
            </div>
          )}
          {result.totals.accounts > 0 && counts.empty + counts.dust === 0 && (
            <div className="mt-8 rounded-2xl border border-line bg-raised p-6">
              <p className="text-16 text-hi">Nothing to reclaim right now</p>
              <p className="mt-2 max-w-[640px] text-14 text-mid">
                None of this wallet's {plural(result.totals.accounts, "token account")} are both empty and safe to close. Accounts with a balance, NFTs, LP and staking tokens, and frozen accounts are left alone.
              </p>
            </div>
          )}

          {result.totals.accounts > 0 && (
            <>
              {/* Toolbar */}
              <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div role="group" aria-label="Filter accounts" className="flex flex-wrap gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={filter === f.key}
                      onClick={() => {
                        setFilter(f.key);
                        setPage(0);
                      }}
                      className={`lift inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-14 ${filter === f.key ? "border-line-hover bg-overlay text-hi" : "border-line bg-transparent text-mid hover:text-hi"}`}
                    >
                      {f.label}
                      <span className="font-mono text-12 text-meta tnum">{counts[f.key].toLocaleString("en-US")}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-14">
                  <Button size="sm" variant="ghost" disabled={busy || counts.empty === 0} onClick={() => setSelected(new Set(accounts.filter((a) => a.status === "empty").map((a) => a.address)))}>
                    Select all empty
                  </Button>
                  {counts.dust > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          for (const a of accounts) if (a.status === "dust") next.add(a.address);
                          return next;
                        })
                      }
                    >
                      <Flame size={14} strokeWidth={1.75} className="text-warn" aria-hidden />
                      Add dust
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy || selected.size === 0} onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                {pageRows.length > 0 ? (
                  <AccountTable
                    rows={pageRows}
                    selected={selected}
                    onToggle={toggle}
                    onTogglePage={togglePage}
                    sort={sort}
                    onSort={onSort}
                    animationKey={`${result.scannedAt}-${filter}-${page}`}
                    disabled={busy}
                  />
                ) : (
                  <p className="rounded-2xl border border-line bg-raised p-8 text-center text-14 text-mid">No accounts in this filter</p>
                )}
              </div>

              {pageCount > 1 && (
                <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-14 text-mid">
                  <span className="font-mono text-12 tnum">
                    {(page * PAGE_SIZE + 1).toLocaleString("en-US")}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE).toLocaleString("en-US")} of {filtered.length.toLocaleString("en-US")}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page">
                      <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
                    </Button>
                    <span className="inline-flex items-center font-mono text-12 tnum">
                      {page + 1} / {pageCount}
                    </span>
                    <Button size="sm" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} aria-label="Next page">
                      <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </>
      )}

      {/* Sticky action bar */}
      <AnimatePresence>
        {result && counts.empty + counts.dust > 0 && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto flex max-w-[960px] flex-col gap-3 rounded-3xl border border-line bg-[var(--frame)] p-3 shadow-[inset_0_1px_0_var(--frame-highlight),0_24px_48px_-20px_rgb(var(--shadow-ink)/0.45)] backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:pl-6">
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="flex items-baseline gap-2">
                  <span className="text-14 text-mid">You get</span>
                  <span className="font-mono text-20 text-accent-ink tnum">
                    <AnimatedNumber value={Math.max(0, selection.netLamports - minNetworkFee)} format={fmtSol} />
                  </span>
                  <span className="text-14 text-accent-dim">SOL</span>
                </p>
                <p className="mt-0.5 truncate text-12 text-meta tnum">
                  {plural(selection.closable, "account")}
                  {selection.burns > 0 && <span className="text-warn"> · burns {selection.burns} dust {selection.burns === 1 ? "balance" : "balances"}</span>}
                  {insufficientSol && <span className="text-warn"> · add 0.00001 SOL for network fees</span>}
                  {readOnly && " · read-only preview"}
                </p>
              </div>
              <SlideToConfirm
                className="w-full sm:w-[340px]"
                label={selection.closable === 0 ? "Select accounts to claim" : `Slide to claim ${formatSol(Math.max(0, selection.netLamports - minNetworkFee))} SOL`}
                disabled={readOnly || selection.closable === 0 || busy || insufficientSol}
                resetKey={`${close.state.status}-${selection.closable}`}
                onConfirm={() => void close.prepare(selectedAccounts)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CloseFlow
        state={close.state}
        owner={owner}
        solPriceUsd={result?.solPriceUsd ?? null}
        onConfirm={(plan) => void close.execute(plan)}
        onCancel={close.reset}
        onDeselect={(addresses) =>
          setSelected((prev) => {
            const next = new Set(prev);
            for (const a of addresses) next.delete(a);
            return next;
          })
        }
      />
    </div>
  );
}
