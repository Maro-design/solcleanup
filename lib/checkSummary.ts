/**
 * The public, aggregate-only view of a wallet scan: counts and lamport totals.
 * No token names, mints or balances, so it is safe to render on a shareable
 * page or send to the browser.
 */
import type { ScanResult, ScanTotals } from "./scan";

export interface CheckSummary {
  owner: string;
  totals: ScanTotals;
  solPriceUsd: number | null;
  scannedAt: number;
}

export function summarize(r: ScanResult): CheckSummary {
  const t = r.totals;
  return {
    owner: r.owner,
    totals: {
      accounts: t.accounts,
      empty: t.empty,
      dust: t.dust,
      protected: t.protected,
      closable: t.closable,
      burns: t.burns,
      reclaimableLamports: t.reclaimableLamports,
      feeLamports: t.feeLamports,
      netLamports: t.netLamports,
    },
    solPriceUsd: r.solPriceUsd,
    scannedAt: r.scannedAt,
  };
}
