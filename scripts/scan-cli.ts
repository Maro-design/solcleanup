/**
 * Build-order step 2: run the scanner against any wallet and log the
 * classification before any UI exists.
 *
 *   NEXT_PUBLIC_RPC_URL=... npm run scan -- <wallet address>
 */
import { Connection } from "@solana/web3.js";
import { RPC_URL } from "../lib/config";
import { parseAddress, scanWallet } from "../lib/scan";
import { formatSol } from "../lib/format";

async function main() {
  const owner = parseAddress(process.argv[2] ?? "");
  if (!owner) throw new Error("Usage: npm run scan -- <wallet address>");
  const connection = new Connection(RPC_URL, "confirmed");
  const result = await scanWallet(connection, owner, (p) =>
    console.log(`[${Math.round(p.fraction * 100).toString().padStart(3)}%] ${p.label}`),
  );
  console.table(
    result.accounts.slice(0, 40).map((a) => ({
      account: a.address.slice(0, 8),
      symbol: a.symbol || a.mint.slice(0, 6),
      program: a.program,
      balance: a.uiAmount,
      rentSol: formatSol(a.lamports, 6),
      usd: a.valueUsd?.toFixed(2) ?? "—",
      status: a.status,
      reasons: a.reasons.join("; "),
    })),
  );
  const t = result.totals;
  console.log({
    accounts: t.accounts,
    empty: t.empty,
    dust: t.dust,
    protected: t.protected,
    closable: t.closable,
    reclaimableSol: formatSol(t.reclaimableLamports, 6),
    feeSol: formatSol(t.feeLamports, 6),
    netSol: formatSol(t.netLamports, 6),
    solPriceUsd: result.solPriceUsd,
  });
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
