"use client";

/**
 * Portfolio: everything this wallet has reclaimed with SolCleanup, read from
 * the chain on request (nothing about the wallet is stored).
 */
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { ExternalLink, Flame, Layers, Loader2, Receipt, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { WSOL_MINT, solscanTx } from "@/lib/config";
import { fetchPrices } from "@/lib/market";
import { formatSol, formatUsd, shortAddress } from "@/lib/format";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { buttonClass } from "@/components/ui/Button";
import { ClaimsChart, type ClaimPoint, type Range } from "./ClaimsChart";

interface Claim extends ClaimPoint {
  signature: string;
}

type Load = { s: "idle" } | { s: "loading" } | { s: "error"; message: string } | { s: "ready"; claims: Claim[] };

const card = "rounded-3xl border border-line bg-raised shadow-[0_24px_56px_-32px_rgb(var(--shadow-ink)/0.5)]";
const ease = [0.16, 1, 0.3, 1] as const;
const RANGES: { key: Range; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

function Stat({ icon: Icon, label, children, foot, accent = false, i }: { icon: LucideIcon; label: string; children: ReactNode; foot?: ReactNode; accent?: boolean; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay: i * 0.06 }}
      className={`rounded-2xl border p-5 shadow-[0_18px_40px_-28px_rgb(var(--shadow-ink)/0.45)] ${accent ? "border-[rgb(100_149_237/0.35)] bg-raised" : "border-line bg-raised"}`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex size-9 items-center justify-center rounded-xl border ${accent ? "border-[rgb(100_149_237/0.4)] bg-[rgb(100_149_237/0.14)] text-accent-ink" : "border-line bg-overlay text-hi"}`}>
          <Icon size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-14 text-mid">{label}</p>
      </div>
      <div className="mt-4">{children}</div>
      {foot && <p className="mt-1 text-12 text-meta tnum">{foot}</p>}
    </motion.div>
  );
}

export function PortfolioView() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;
  const [load, setLoad] = useState<Load>({ s: "idle" });
  const [range, setRange] = useState<Range>("day");
  const [solUsd, setSolUsd] = useState<number | null>(null);

  useEffect(() => {
    if (!wallet) return setLoad({ s: "idle" });
    let live = true;
    setLoad({ s: "loading" });
    fetch(`/api/portfolio?wallet=${encodeURIComponent(wallet)}`)
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { claims?: Claim[]; error?: string };
        if (!live) return;
        if (!r.ok || !body.claims) setLoad({ s: "error", message: body.error ?? "Couldn't load your history" });
        else setLoad({ s: "ready", claims: body.claims });
      })
      .catch(() => live && setLoad({ s: "error", message: "Couldn't load your history" }));
    fetchPrices([WSOL_MINT])
      .then((m) => live && setSolUsd(m.get(WSOL_MINT) ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [wallet]);

  const claims = useMemo(() => (load.s === "ready" ? load.claims : []), [load]);
  const totals = useMemo(
    () => ({
      count: claims.length,
      received: claims.reduce((s, c) => s + Math.max(0, c.receivedLamports), 0),
      closed: claims.reduce((s, c) => s + c.closed, 0),
      burned: claims.reduce((s, c) => s + c.burned, 0),
    }),
    [claims],
  );
  const int = (n: number) => Math.round(n).toLocaleString("en-US");

  return (
    <section aria-labelledby="portfolio-title" className="mx-auto w-full max-w-[1200px] px-6">
      {/* Header */}
      <div className={`${card} flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8`}>
        <div className="max-w-[560px]">
          <h1 id="portfolio-title" className="heading text-32 font-medium text-hi">
            Portfolio
          </h1>
          <p className="mt-2 text-16 text-mid">Everything this wallet has reclaimed with SolCleanup: rent recovered, accounts closed and items burned.</p>
        </div>
        {wallet ? (
          <div className="shrink-0 rounded-2xl border border-line bg-base px-4 py-3">
            <p className="text-12 text-meta">Connected wallet</p>
            <p className="mt-1 font-mono text-14 text-accent-ink">{shortAddress(wallet, 6)}</p>
          </div>
        ) : (
          <ConnectButton variant="primary" size="lg" />
        )}
      </div>

      {!wallet && <p className="mt-6 rounded-2xl border border-line bg-raised p-6 text-center text-14 text-mid">Connect your wallet to see your history.</p>}

      {wallet && (
        <>
          {load.s === "error" && <p className="mt-6 rounded-2xl border border-line bg-raised p-5 text-14 text-danger">{load.message}. Try again in a moment.</p>}

          {/* Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat i={0} icon={Receipt} label="Claims">
              <p className="font-mono text-32 leading-none text-hi">{load.s === "loading" ? "…" : <AnimatedNumber value={totals.count} format={int} />}</p>
            </Stat>
            <Stat i={1} icon={Wallet} label="SOL reclaimed" accent foot={solUsd ? `≈ ${formatUsd((totals.received / 1e9) * solUsd)}` : undefined}>
              <p className="font-mono text-32 leading-none text-accent-ink">
                {load.s === "loading" ? "…" : <AnimatedNumber value={totals.received} format={(n) => formatSol(n)} />}
                <span className="ml-2 text-14 text-accent-dim">SOL</span>
              </p>
            </Stat>
            <Stat i={2} icon={Layers} label="Accounts closed">
              <p className="font-mono text-32 leading-none text-hi">{load.s === "loading" ? "…" : <AnimatedNumber value={totals.closed} format={int} />}</p>
            </Stat>
            <Stat i={3} icon={Flame} label="Items burned">
              <p className="font-mono text-32 leading-none text-hi">{load.s === "loading" ? "…" : <AnimatedNumber value={totals.burned} format={int} />}</p>
            </Stat>
          </div>

          {/* Chart */}
          <div className={`${card} mt-6 p-6 sm:p-8`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="heading text-20 font-medium text-hi">SOL reclaimed over time</h2>
                <p className="mt-1 text-14 text-mid">Net SOL your wallet received from each claim, after fees.</p>
              </div>
              <div role="group" aria-label="Time range" className="relative flex rounded-full border border-line bg-base p-1">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={range === r.key}
                    onClick={() => setRange(r.key)}
                    className={`relative z-10 rounded-full px-4 py-1.5 text-14 transition-colors ${range === r.key ? "text-[var(--bg-base)]" : "text-mid hover:text-hi"}`}
                  >
                    {range === r.key && (
                      <motion.span layoutId="range-pill" className="absolute inset-0 -z-10 rounded-full bg-hi" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                    )}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6">
              {load.s === "loading" ? (
                <p className="flex h-[220px] items-center justify-center gap-2 text-14 text-mid">
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> Reading your history from the chain…
                </p>
              ) : (
                <ClaimsChart points={claims} range={range} />
              )}
            </div>
          </div>

          {/* Recent claims (also the table view of the chart) */}
          <div className={`${card} mt-6 overflow-hidden`}>
            <div className="flex items-center justify-between p-6 sm:px-8">
              <h2 className="heading text-20 font-medium text-hi">Recent claims</h2>
              {claims.length === 0 && load.s === "ready" && (
                <Link href="/app" className={buttonClass("primary", "sm")}>
                  Start cleaning
                </Link>
              )}
            </div>
            {claims.length === 0 ? (
              <p className="border-t border-line px-6 py-10 text-center text-14 text-meta sm:px-8">
                {load.s === "loading" ? "Loading…" : "No SolCleanup claims from this wallet yet."}
              </p>
            ) : (
              <table className="w-full border-t border-line text-14">
                <thead>
                  <tr className="text-left text-12 text-meta">
                    <th className="px-6 py-3 font-normal sm:px-8">Date</th>
                    <th className="px-3 py-3 text-right font-normal">Closed</th>
                    <th className="hidden px-3 py-3 text-right font-normal sm:table-cell">Burned</th>
                    <th className="px-3 py-3 text-right font-normal">Received</th>
                    <th className="px-6 py-3 text-right font-normal sm:px-8">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.slice(0, 20).map((c) => (
                    <tr key={c.signature} className="border-t border-line">
                      <td className="px-6 py-3 text-hi sm:px-8">
                        {new Date(c.time * 1000).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-mid tnum">{c.closed}</td>
                      <td className="hidden px-3 py-3 text-right font-mono text-mid tnum sm:table-cell">{c.burned}</td>
                      <td className={`px-3 py-3 text-right font-mono tnum ${c.receivedLamports >= 0 ? "text-accent-ink" : "text-mid"}`}>
                        {c.receivedLamports >= 0 ? "+" : "−"}
                        {formatSol(Math.abs(c.receivedLamports))}
                      </td>
                      <td className="px-6 py-3 text-right sm:px-8">
                        <a href={solscanTx(c.signature)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-12 text-meta hover:text-hi">
                          {shortAddress(c.signature, 4)}
                          <ExternalLink size={12} strokeWidth={1.5} aria-hidden />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </section>
  );
}
