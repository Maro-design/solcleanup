/**
 * Transaction builder for closing empty token accounts.
 *
 * Each batch is one v0 transaction:
 *   1. ComputeBudget.setComputeUnitLimit   (simulated, then padded)
 *   2. ComputeBudget.setComputeUnitPrice   (recent prioritization fee percentile)
 *   3. per account: [burnChecked, dust only] + closeAccount
 *      (owner = user, destination = user; at most 22 slots, a burn costs 3)
 *   4. SystemProgram.transfer → FEE_WALLET (floor(rent × FEE_BPS / 10 000))
 *      With a referrer, the same fee is split: referralShareBps(referrer) of it goes
 *      to the referrer in a second transfer. The user pays the same total.
 *
 * The fee settles atomically with the closes: if the transaction fails,
 * nothing is closed and no fee moves. Every transaction is simulated before
 * the wallet is asked to sign; a failing simulation never reaches the wallet.
 */
import {
  ComputeBudgetProgram,
  type Connection,
  PublicKey,
  SystemProgram,
  type TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  type ParsedAccountData,
} from "@solana/web3.js";
import { createBurnCheckedInstruction, createCloseAccountInstruction } from "@solana/spl-token";
import {
  BURN_SLOT_COST,
  CU_PADDING_FLAT,
  CU_PADDING_RATIO,
  CU_SIMULATION_LIMIT,
  FEE_BPS,
  FEE_WALLET,
  referralShareBps,
  LAMPORTS_PER_SIGNATURE,
  MAX_CLOSES_PER_TX,
  PRIORITY_FEE_MAX,
  PRIORITY_FEE_MIN,
  PRIORITY_FEE_PERCENTILE,
  VALUE_THRESHOLD_USD,
} from "./config";
import { decodeError } from "./errors";
import { feeFor, type ScannedAccount } from "./scan";
import { createBurnNftInstruction } from "./nft";
import { createBurnCnftInstruction, fetchCnftProof } from "./cnft";

export interface Batch {
  index: number;
  accounts: ScannedAccount[];
  rentLamports: number;
  /** Total service fee the user pays (unchanged by referrals). */
  feeLamports: number;
  /** Referrer wallet receiving part of the fee, if any. */
  referrer?: string;
  /** Part of feeLamports that goes to the referrer. */
  referralLamports: number;
}

/** The referrer's cut of a fee, rounded down to the lamport. */
export const referralFor = (feeLamports: number, referrer?: string): number =>
  Math.floor((feeLamports * referralShareBps(referrer)) / 10_000);

/** Recompute fee and referral for a given rent, keeping the batch's referrer. */
function withRent(b: Batch, rent: number, referrer: string | undefined = b.referrer): Batch {
  const fee = feeFor(rent);
  return { ...b, rentLamports: rent, feeLamports: fee, referrer, referralLamports: referrer ? referralFor(fee, referrer) : 0 };
}

export interface SimulatedBatch extends Batch {
  computeUnitLimit: number;
  priorityMicroLamports: number;
  networkFeeLamports: number;
  /** Null when simulation passed. */
  simulationError: string | null;
  instructionCount: number;
}

export interface Plan {
  batches: SimulatedBatch[];
  /** Batches that passed simulation. */
  ready: SimulatedBatch[];
  priorityMicroLamports: number;
  totals: {
    accounts: number;
    grossLamports: number;
    feeLamports: number;
    networkFeeLamports: number;
    netLamports: number;
  };
}

export interface PreflightOffender {
  account: ScannedAccount;
  uiAmount: number;
  valueUsd: number | null;
  reason: string;
}

export type BatchOutcome =
  | { index: number; ok: true; signature: string; accounts: number; rentLamports: number; feeLamports: number }
  | { index: number; ok: false; signature: string | null; accounts: number; rentLamports: number; feeLamports: number; error: string };

export interface ExecutionProgress {
  phase: "preparing" | "signing" | "sending" | "done";
  batchIndex: number;
  batchCount: number;
  closedAccounts: number;
  recoveredLamports: number;
  outcomes: BatchOutcome[];
}

/** Minimal wallet surface we depend on — satisfied by wallet-adapter's useWallet(). */
export interface SigningWallet {
  publicKey: PublicKey;
  signTransaction?: <T extends VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions?: <T extends VersionedTransaction>(txs: T[]) => Promise<T[]>;
}

const feeWallet = new PublicKey(FEE_WALLET);

// ---------------------------------------------------------------------------
// Batching
// ---------------------------------------------------------------------------

const slotCost = (a: ScannedAccount) => (a.kind === "token" ? (a.burn ? BURN_SLOT_COST : 1) : BURN_SLOT_COST);
const MAX_TX_BYTES = 1232;
const DUMMY_BLOCKHASH = "11111111111111111111111111111111";

const toBatch = (slice: ScannedAccount[], index: number, referrer?: string): Batch =>
  withRent({ index, accounts: slice, rentLamports: 0, feeLamports: 0, referralLamports: 0 }, slice.reduce((sum, a) => sum + a.lamports, 0), referrer);

/** Serialized size of a batch's transaction, or Infinity if it can't be built yet (e.g. cNFT proof not fetched). */
function txSize(owner: PublicKey, slice: ScannedAccount[], referrer?: string): number {
  try {
    const ixs = buildInstructions(owner, toBatch(slice, 0, referrer), 1_400_000, PRIORITY_FEE_MAX);
    return compile(owner, ixs, DUMMY_BLOCKHASH).serialize().length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Split selected accounts into transactions: at most MAX_CLOSES_PER_TX slots
 * (burns cost more) and, when the owner is known, never over 1232 bytes.
 * Without an owner (UI estimates) only the slot cap applies.
 */
export function makeBatches(accounts: ScannedAccount[], owner?: PublicKey, referrer?: string): Batch[] {
  const closable = accounts.filter((a) => a.closable);
  const groups: ScannedAccount[][] = [];
  let current: ScannedAccount[] = [];
  let used = 0;
  for (const a of closable) {
    const tooMany = used + slotCost(a) > MAX_CLOSES_PER_TX;
    const tooBig = owner !== undefined && current.length > 0 && txSize(owner, [...current, a], referrer) > MAX_TX_BYTES;
    if ((tooMany || tooBig) && current.length > 0) {
      groups.push(current);
      current = [];
      used = 0;
    }
    current.push(a);
    used += slotCost(a);
  }
  if (current.length > 0) groups.push(current);
  return groups.map((g, i) => toBatch(g, i, referrer));
}

/** Number of burn instructions in a batch. */
export const burnsIn = (b: Batch): number => b.accounts.filter((a) => a.burn).length;

/** The exact instruction list for one batch. */
export function buildInstructions(
  owner: PublicKey,
  batch: Batch,
  computeUnitLimit: number,
  priorityMicroLamports: number,
): TransactionInstruction[] {
  const ixs: TransactionInstruction[] = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityMicroLamports }),
  ];
  for (const a of batch.accounts) {
    if (a.kind === "nft" && a.nft) {
      // Token Metadata burns the NFT and closes token, metadata and edition accounts in one go.
      ixs.push(createBurnNftInstruction(owner, new PublicKey(a.mint), new PublicKey(a.address), a.nft));
      continue;
    }
    if (a.kind === "cnft" && a.cnft) {
      ixs.push(createBurnCnftInstruction(owner, a.cnft));
      continue;
    }
    if (a.burn) {
      // Burn exactly the scanned balance. If it changed, burnChecked or the
      // close fails and the whole transaction reverts, fee included.
      ixs.push(
        createBurnCheckedInstruction(
          new PublicKey(a.address),
          new PublicKey(a.mint),
          owner,
          BigInt(a.amountRaw),
          a.decimals,
          [],
          new PublicKey(a.programId),
        ),
      );
    }
    ixs.push(
      createCloseAccountInstruction(
        new PublicKey(a.address),
        owner, // destination: rent goes back to the user
        owner, // authority: the user
        [],
        new PublicKey(a.programId),
      ),
    );
  }
  // Fee is computed from this batch's rent only, using the same function the UI shows.
  const fee = Math.floor((batch.rentLamports * FEE_BPS) / 10_000);
  const referral = batch.referrer ? Math.min(fee, batch.referralLamports) : 0;
  if (fee - referral > 0) {
    ixs.push(SystemProgram.transfer({ fromPubkey: owner, toPubkey: feeWallet, lamports: fee - referral }));
  }
  if (batch.referrer && referral > 0) {
    ixs.push(SystemProgram.transfer({ fromPubkey: owner, toPubkey: new PublicKey(batch.referrer), lamports: referral }));
  }
  return ixs;
}

function compile(owner: PublicKey, ixs: TransactionInstruction[], blockhash: string): VersionedTransaction {
  const message = new TransactionMessage({ payerKey: owner, recentBlockhash: blockhash, instructions: ixs }).compileToV0Message();
  return new VersionedTransaction(message);
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

/**
 * Priority fee: the configured percentile of recent non-zero prioritization
 * fees for the accounts we write to, clamped to sane bounds.
 */
export async function estimatePriorityFee(connection: Connection, writable: PublicKey[]): Promise<number> {
  try {
    const recent = await connection.getRecentPrioritizationFees({ lockedWritableAccounts: writable.slice(0, 128) });
    const fees = recent.map((f) => f.prioritizationFee).filter((f) => f > 0).sort((a, b) => a - b);
    if (fees.length === 0) return PRIORITY_FEE_MIN;
    const idx = Math.min(fees.length - 1, Math.floor(fees.length * PRIORITY_FEE_PERCENTILE));
    const pick = fees[idx] ?? PRIORITY_FEE_MIN;
    return Math.min(PRIORITY_FEE_MAX, Math.max(PRIORITY_FEE_MIN, pick));
  } catch {
    return PRIORITY_FEE_MIN;
  }
}

export const networkFeeFor = (computeUnitLimit: number, microLamports: number): number =>
  LAMPORTS_PER_SIGNATURE + Math.ceil((computeUnitLimit * microLamports) / 1_000_000);

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

async function simulate(
  connection: Connection,
  owner: PublicKey,
  batch: Batch,
  priority: number,
  blockhash: string,
): Promise<{ unitsConsumed: number | null; error: string | null; reclaimed: number | null }> {
  const tx = compile(owner, buildInstructions(owner, batch, CU_SIMULATION_LIMIT, priority), blockhash);
  const sources = rentSources(batch.accounts);
  const sim = await connection.simulateTransaction(tx, {
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
    accounts: { encoding: "base64", addresses: sources.map((x) => x.address) },
  });
  if (sim.value.err) {
    return { unitsConsumed: null, error: decodeError(sim.value.err, sim.value.logs ?? undefined), reclaimed: null };
  }
  // Rent actually released = lamports before − lamports left after the simulated transaction.
  const post = sim.value.accounts;
  const reclaimed = post && post.length === sources.length
    ? sources.reduce((sum, x, i) => sum + x.lamports - (post[i]?.lamports ?? 0), 0)
    : null;
  return { unitsConsumed: sim.value.unitsConsumed ?? null, error: null, reclaimed };
}

/** Every account a batch closes, with its lamports at scan time. */
function rentSources(accounts: ScannedAccount[]): { address: string; lamports: number }[] {
  return accounts.flatMap((a) => {
    if (a.kind === "cnft") return [];
    if (a.kind === "nft" && a.nft) {
      const extra = a.nft.sources.reduce((s, x) => s + x.lamports, 0);
      return [{ address: a.address, lamports: a.lamports - extra }, ...a.nft.sources];
    }
    return [{ address: a.address, lamports: a.lamports }];
  });
}

const padUnits = (units: number | null, accounts: number): number =>
  units === null
    ? 10_000 + accounts * 4_000 // conservative fallback if the RPC omits unitsConsumed
    : Math.ceil(units * CU_PADDING_RATIO) + CU_PADDING_FLAT;

/**
 * Build and simulate every batch. Failed simulations are kept in the plan with
 * a decoded error so the UI can show them; they are never sent to the wallet.
 */
export async function planClose(
  connection: Connection,
  owner: PublicKey,
  accounts: ScannedAccount[],
  onProgress?: (done: number, total: number) => void,
  referrerWallet?: string,
): Promise<Plan> {
  // Never let a wallet refer itself.
  const referrer = referrerWallet && referrerWallet !== owner.toBase58() ? referrerWallet : undefined;
  // cNFTs need a fresh Merkle proof before their transaction can be built or sized.
  const prepared: ScannedAccount[] = [];
  for (const a of accounts) {
    if (a.kind === "cnft" && a.cnft) {
      const proof = await fetchCnftProof(connection, a.address, a.cnft.canopyDepth);
      prepared.push({ ...a, cnft: { ...a.cnft, proof } });
    } else {
      prepared.push(a);
    }
  }
  const batches = makeBatches(prepared, owner, referrer);
  const writable = batches.flatMap((b) => b.accounts.map((a) => new PublicKey(a.address)));
  const priority = await estimatePriorityFee(connection, writable);
  const [{ blockhash }, feeWalletLamports, rentMinimum, referrerLamports] = await Promise.all([
    connection.getLatestBlockhash("confirmed"),
    connection.getBalance(feeWallet, "confirmed").catch(() => null),
    connection.getMinimumBalanceForRentExemption(0).catch(() => 890_880),
    referrer ? connection.getBalance(new PublicKey(referrer), "confirmed").catch(() => null) : Promise.resolve(null),
  ]);
  // An empty wallet can't receive less than the rent-exempt minimum. Rather than
  // fail the claim, that batch pays its whole fee to the service wallet.
  const referralFits = (b: Batch) => !b.referrer || b.referralLamports === 0 || referrerLamports !== 0 || b.referralLamports >= rentMinimum;

  const simulated: SimulatedBatch[] = [];
  for (const original of batches) {
    let batch = referralFits(original) ? original : withRent(original, original.rentLamports, undefined);
    let result: { unitsConsumed: number | null; error: string | null; reclaimed: number | null };
    try {
      result = await simulate(connection, owner, batch, priority, blockhash);
      // Charge the fee on what the chain really returns (NFT metadata can hold
      // less than its scan-time balance). Re-simulate if the amount changed.
      if (!result.error && result.reclaimed !== null && result.reclaimed >= 0 && result.reclaimed !== batch.rentLamports) {
        batch = withRent(batch, result.reclaimed);
        if (!referralFits(batch)) batch = withRent(batch, batch.rentLamports, undefined);
        result = await simulate(connection, owner, batch, priority, blockhash);
      }
    } catch (e) {
      result = { unitsConsumed: null, error: decodeError(e), reclaimed: null };
    }
    // A system account can't be created with less than the rent-exempt minimum,
    // so small fees fail until the fee wallet holds some SOL. Say so plainly.
    if (result.error && feeWalletLamports === 0 && batch.feeLamports > 0 && batch.feeLamports < rentMinimum) {
      result.error =
        "SolCleanup's fee wallet isn't set up yet, so this can't go through right now. Please try again later";
    }
    const cu = padUnits(result.unitsConsumed, batch.accounts.length);
    simulated.push({
      ...batch,
      computeUnitLimit: cu,
      priorityMicroLamports: priority,
      networkFeeLamports: networkFeeFor(cu, priority),
      simulationError: result.error,
      instructionCount: buildInstructions(owner, batch, cu, priority).length,
    });
    onProgress?.(simulated.length, batches.length);
  }

  const ready = simulated.filter((b) => b.simulationError === null);
  const gross = ready.reduce((s, b) => s + b.rentLamports, 0);
  const fee = ready.reduce((s, b) => s + b.feeLamports, 0);
  const network = ready.reduce((s, b) => s + b.networkFeeLamports, 0);
  return {
    batches: simulated,
    ready,
    priorityMicroLamports: priority,
    totals: {
      accounts: ready.reduce((s, b) => s + b.accounts.length, 0),
      grossLamports: gross,
      feeLamports: fee,
      networkFeeLamports: network,
      netLamports: gross - fee - network,
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-flight safety check
// ---------------------------------------------------------------------------

/**
 * Re-read every selected account right before signing. Blocks if any account
 * is no longer empty, changed owner, became frozen, or disappeared. Values
 * over $1 are named explicitly so the UI can show a warning modal.
 */
export async function preflightCheck(
  connection: Connection,
  owner: PublicKey,
  accounts: ScannedAccount[],
): Promise<PreflightOffender[]> {
  const offenders: PreflightOffender[] = [];
  const ownerStr = owner.toBase58();
  // cNFTs have no token account; their proof is checked by simulation instead.
  const tokenAccounts = accounts.filter((a) => a.kind !== "cnft");
  for (let i = 0; i < tokenAccounts.length; i += 100) {
    const slice = tokenAccounts.slice(i, i + 100);
    const infos = await connection.getMultipleParsedAccounts(
      slice.map((a) => new PublicKey(a.address)),
      { commitment: "confirmed" },
    );
    infos.value.forEach((info, j) => {
      const acct = slice[j];
      if (!acct) return;
      if (!info) {
        offenders.push({ account: acct, uiAmount: 0, valueUsd: null, reason: "Account no longer exists (already closed?)" });
        return;
      }
      const data = info.data as ParsedAccountData | Buffer;
      const parsed = !Buffer.isBuffer(data) && typeof data === "object" && "parsed" in data ? (data.parsed as { info?: Record<string, unknown> }) : null;
      const inf = parsed?.info;
      if (!inf) {
        offenders.push({ account: acct, uiAmount: 0, valueUsd: null, reason: "Account data could not be verified" });
        return;
      }
      const ta = (inf.tokenAmount ?? {}) as { amount?: string; uiAmount?: number };
      const ui = typeof ta.uiAmount === "number" ? ta.uiAmount : 0;
      if (inf.owner !== ownerStr) {
        offenders.push({ account: acct, uiAmount: ui, valueUsd: null, reason: "Owner changed" });
      } else if (inf.state === "frozen" && acct.nft?.tokenRecord == null) {
        offenders.push({ account: acct, uiAmount: ui, valueUsd: null, reason: "Account is frozen" });
      } else if (acct.burn) {
        if (ta.amount !== acct.amountRaw) {
          offenders.push({ account: acct, uiAmount: ui, valueUsd: null, reason: "Balance changed since the scan" });
        }
      } else if (ta.amount !== "0") {
        const value = acct.priceUsd !== null ? ui * acct.priceUsd : null;
        offenders.push({
          account: acct,
          uiAmount: ui,
          valueUsd: value,
          reason:
            value !== null && value >= VALUE_THRESHOLD_USD
              ? `Now holds a balance worth about $${value.toFixed(2)}`
              : "Now holds a non-zero balance",
        });
      }
    });
  }
  return offenders;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Confirm by polling signature status (no websocket dependency). Resolves to
 * the transaction error, or null on success. Throws "expired" once the
 * blockhash can no longer land.
 */
async function confirmByPolling(connection: Connection, signature: string, lastValidBlockHeight: number): Promise<unknown> {
  for (;;) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value[0];
    if (status?.err) return status.err;
    if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) return null;
    const height = await connection.getBlockHeight("confirmed");
    if (height > lastValidBlockHeight) {
      // One last look in case it landed in the final slot.
      const last = (await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
      if (last?.err) return last.err;
      if (last?.confirmationStatus) return null;
      throw new Error("Transaction expired: block height exceeded");
    }
    await sleep(1500);
  }
}

/**
 * Sign and send the ready batches. Transactions are rebuilt with a fresh
 * blockhash and re-simulated immediately before the signature prompt.
 * One failing batch never stops the others.
 */
export async function executePlan(
  connection: Connection,
  wallet: SigningWallet,
  plan: Plan,
  onProgress: (p: ExecutionProgress) => void,
): Promise<BatchOutcome[]> {
  const owner = wallet.publicKey;
  const outcomes: BatchOutcome[] = [];
  const total = plan.ready.length;
  let closed = 0;
  let recovered = 0;
  const emit = (phase: ExecutionProgress["phase"], batchIndex: number) =>
    onProgress({ phase, batchIndex, batchCount: total, closedAccounts: closed, recoveredLamports: recovered, outcomes: [...outcomes] });

  emit("preparing", 0);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  // Rebuild + re-simulate with the fresh blockhash.
  const prepared: { batch: SimulatedBatch; tx: VersionedTransaction }[] = [];
  for (const batch of plan.ready) {
    const tx = compile(owner, buildInstructions(owner, batch, batch.computeUnitLimit, batch.priorityMicroLamports), blockhash);
    const sim = await connection.simulateTransaction(tx, { sigVerify: false, commitment: "confirmed" });
    if (sim.value.err) {
      outcomes.push({
        index: batch.index,
        ok: false,
        signature: null,
        accounts: batch.accounts.length,
        rentLamports: batch.rentLamports,
        feeLamports: batch.feeLamports,
        error: decodeError(sim.value.err, sim.value.logs ?? undefined),
      });
    } else {
      prepared.push({ batch, tx });
    }
  }
  if (prepared.length === 0) {
    emit("done", total);
    return outcomes;
  }

  // One wallet prompt when supported; otherwise one per batch.
  emit("signing", 0);
  let signed: VersionedTransaction[];
  if (wallet.signAllTransactions) {
    signed = await wallet.signAllTransactions(prepared.map((p) => p.tx));
  } else if (wallet.signTransaction) {
    signed = [];
    for (const p of prepared) signed.push(await wallet.signTransaction(p.tx));
  } else {
    throw new Error("This wallet can't sign transactions");
  }

  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i];
    const tx = signed[i];
    if (!p || !tx) continue;
    emit("sending", i + 1);
    let signature: string | null = null;
    try {
      signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
      const err = await confirmByPolling(connection, signature, lastValidBlockHeight);
      if (err) throw err;
      closed += p.batch.accounts.length;
      recovered += p.batch.rentLamports - p.batch.feeLamports;
      outcomes.push({
        index: p.batch.index,
        ok: true,
        signature,
        accounts: p.batch.accounts.length,
        rentLamports: p.batch.rentLamports,
        feeLamports: p.batch.feeLamports,
      });
    } catch (e) {
      outcomes.push({
        index: p.batch.index,
        ok: false,
        signature,
        accounts: p.batch.accounts.length,
        rentLamports: p.batch.rentLamports,
        feeLamports: p.batch.feeLamports,
        error: decodeError(e),
      });
    }
    emit("sending", i + 1);
  }

  outcomes.sort((a, b) => a.index - b.index);
  emit("done", total);
  return outcomes;
}
