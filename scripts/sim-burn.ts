/**
 * Dev check: simulate burn/close batches for a wallet without signing
 * anything, and print sizes, measured rent and simulation results.
 *
 *   npx tsx scripts/sim-burn.ts <wallet address> [nft]
 */
import { Connection } from "@solana/web3.js";
import { RPC_URL } from "../lib/config";
import { parseAddress, scanWallet } from "../lib/scan";
import { makeBatches, planClose } from "../lib/close";
import { formatSol } from "../lib/format";

async function main() {
  const owner = parseAddress(process.argv[2] ?? "");
  if (!owner) throw new Error("Usage: npx tsx scripts/sim-burn.ts <wallet address> [nft]");
  const connection = new Connection(RPC_URL, "confirmed");
  const { accounts } = await scanWallet(connection, owner);
  const by = (k: string) => accounts.filter((a) => a.kind === k);
  console.log(`tokens ${by("token").length}, nfts ${by("nft").length}, cnfts ${by("cnft").length}`);

  const pick =
    process.argv[3] === "nft"
      ? [...by("nft").slice(0, 6), ...accounts.filter((a) => a.status === "empty").slice(0, 3)]
      : process.argv[3] === "cnft"
        ? [...by("cnft").slice(0, 4), ...accounts.filter((a) => a.status === "empty").slice(0, 2)]
        : [
          ...accounts.filter((a) => a.status === "dust").slice(0, 4),
          ...accounts.filter((a) => a.kind === "token" && a.status === "protected" && a.closable && a.burn).slice(0, 5),
          ...accounts.filter((a) => a.status === "empty").slice(0, 6),
        ];
  for (const a of pick.filter((x) => x.kind === "nft")) {
    console.log(`  nft ${a.symbol || a.mint.slice(0, 6)} std=${a.nft?.tokenStandard} est rent ${formatSol(a.lamports, 6)}`);
  }
  console.log("batches (estimate):", makeBatches(pick).map((b) => b.accounts.length));
  const referrer = process.argv[4];
  const plan = await planClose(connection, owner, pick, undefined, referrer);
  for (const b of plan.batches) {
    console.log(`tx ${b.index + 1}: ${b.accounts.length} accts, ${b.instructionCount} ix, rent ${formatSol(b.rentLamports, 6)}, fee ${formatSol(b.feeLamports, 6)} (referrer ${formatSol(b.referralLamports, 6)}), CU ${b.computeUnitLimit}, sim: ${b.simulationError ?? "ok"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
