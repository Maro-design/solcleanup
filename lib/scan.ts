/**
 * Wallet scan: fetch every SPL Token and Token-2022 account owned by a wallet,
 * resolve mint data, prices and metadata, and classify each account.
 *
 * Safety model (see README "Safety rules"):
 *   - Empty accounts (raw balance exactly 0) are closable.
 *   - Dust (priced, worth under VALUE_THRESHOLD_USD) can be burned then closed,
 *     but only when the user opts in; it is never selected by default.
 *   - Anything worth VALUE_THRESHOLD_USD or more, NFTs, LP and staking tokens and
 *     unpriced balances are protected: never in a default selection, but the
 *     user may tick them one by one to burn and close.
 *   - Frozen accounts, foreign close authorities, Token-2022 withheld fees or
 *     confidential balances, unverifiable mints and wrapped SOL balances are
 *     hard-blocked and can never be selected.
 *   - Missing data (price, mint) is always resolved conservatively.
 */
import {
  type Connection,
  type ParsedAccountData,
  PublicKey,
  type AccountInfo,
} from "@solana/web3.js";
import {
  FEE_BPS,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  VALUE_THRESHOLD_USD,
  WSOL_MINT,
} from "./config";
import { LP_MINT_AUTHORITIES, LP_NAME_PATTERNS, LST_MINTS } from "./protected";
import { fetchPrices, fetchTokenMeta, type TokenMeta } from "./market";
import { fetchNftInfo, TokenStandard, type NftInfo, type RentSource } from "./nft";
import { fetchCnfts, type CnftInfo } from "./cnft";
import { sweepAssets } from "./das";

export type AccountStatus = "empty" | "dust" | "protected";
export type TokenProgram = "spl" | "token2022";
/** token: a plain token account. nft: a Metaplex NFT burned whole. cnft: a compressed NFT (no account, no rent). */
export type AssetKind = "token" | "nft" | "cnft";

export interface ScannedAccount {
  /** Token account address (asset id for cNFTs). */
  address: string;
  kind: AssetKind;
  /** Metaplex NFTs only. */
  nft?: NftInfo;
  /** Compressed NFTs only. */
  cnft?: CnftInfo;
  mint: string;
  program: TokenProgram;
  programId: string;
  /** Raw integer balance as a string (exact). */
  amountRaw: string;
  uiAmount: number;
  decimals: number;
  /** Lamports held by the account — what closing returns. */
  lamports: number;
  frozen: boolean;
  closeAuthority: string | null;
  symbol: string;
  name: string;
  logo: string | null;
  priceUsd: number | null;
  valueUsd: number | null;
  status: AccountStatus;
  /** Human-readable reasons for the status (shown on protected rows). */
  reasons: string[];
  /** True for empty accounts and burnable dust. Never for protected ones. */
  closable: boolean;
  /** Dust only: the balance must be burned (exactly amountRaw) before the close. */
  burn: boolean;
}

export interface ScanTotals {
  accounts: number;
  empty: number;
  dust: number;
  protected: number;
  closable: number;
  /** Counted accounts that need a burn first. */
  burns: number;
  reclaimableLamports: number;
  feeLamports: number;
  netLamports: number;
}

export interface ScanResult {
  owner: string;
  accounts: ScannedAccount[];
  totals: ScanTotals;
  solPriceUsd: number | null;
  scannedAt: number;
}

export type ScanPhase = "token" | "token2022" | "mints" | "market" | "done";

export interface ScanProgress {
  phase: ScanPhase;
  label: string;
  /** 0..1, tied to completed work units. */
  fraction: number;
}

interface MintData {
  decimals: number;
  supply: string;
  mintAuthority: string | null;
}

type ParsedTokenAccount = { pubkey: PublicKey; account: AccountInfo<ParsedAccountData> };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Validate a base58 address string. Returns a PublicKey or null. */
export function parseAddress(input: string): PublicKey | null {
  const trimmed = input.trim();
  if (trimmed.length < 32 || trimmed.length > 44) return null;
  try {
    return new PublicKey(trimmed);
  } catch {
    return null;
  }
}

/** Fee owed on a given amount of reclaimed rent — identical math to the transaction builder. */
export const feeFor = (rentLamports: number): number => Math.floor((rentLamports * FEE_BPS) / 10_000);

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchMints(connection: Connection, mints: string[]): Promise<Map<string, MintData>> {
  const out = new Map<string, MintData>();
  const keys = mints.map((m) => new PublicKey(m));
  const slices: PublicKey[][] = [];
  for (let i = 0; i < keys.length; i += 100) slices.push(keys.slice(i, i + 100));
  // A few requests at a time: big wallets have 100+ slices, and one by one took ~20s.
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, slices.length) }, async () => {
      while (next < slices.length) {
        const slice = slices[next++] as PublicKey[];
        let infos: Awaited<ReturnType<Connection["getMultipleParsedAccounts"]>> | undefined;
        for (let attempt = 0; !infos; attempt++) {
          try {
            infos = await connection.getMultipleParsedAccounts(slice, { commitment: "confirmed" });
          } catch (e) {
            if (attempt >= 3) throw e;
            await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          }
        }
        infos.value.forEach((info, j) => {
          const key = slice[j];
          if (!info || !key) return;
          const data = info.data;
          if (!("parsed" in data)) return;
          const parsed: unknown = data.parsed;
          if (!isRecord(parsed) || !isRecord(parsed.info)) return;
          const inf = parsed.info;
          out.set(key.toBase58(), {
            decimals: typeof inf.decimals === "number" ? inf.decimals : 0,
            supply: typeof inf.supply === "string" ? inf.supply : "0",
            mintAuthority: typeof inf.mintAuthority === "string" ? inf.mintAuthority : null,
          });
        });
      }
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

interface RawAccount {
  address: string;
  mint: string;
  program: TokenProgram;
  programId: string;
  amountRaw: string;
  uiAmount: number;
  decimals: number;
  lamports: number;
  frozen: boolean;
  closeAuthority: string | null;
  extensionReasons: string[];
}

/** Extract the fields we need from a parsed token account, defensively. */
function readTokenAccount(item: ParsedTokenAccount, program: TokenProgram, owner: string): RawAccount | null {
  const data = item.account.data;
  if (!isRecord(data.parsed) || !isRecord(data.parsed.info)) return null;
  const info = data.parsed.info;
  if (info.owner !== owner) return null; // never trust an account we don't own
  const ta = isRecord(info.tokenAmount) ? info.tokenAmount : {};
  const extensionReasons: string[] = [];

  // Token-2022 extensions that make a close unsafe or impossible.
  if (Array.isArray(info.extensions)) {
    for (const ext of info.extensions) {
      if (!isRecord(ext)) continue;
      const state = isRecord(ext.state) ? ext.state : {};
      if (ext.extension === "transferFeeAmount" && String(state.withheldAmount ?? "0") !== "0") {
        extensionReasons.push("Has withheld transfer fees");
      }
      if (ext.extension === "confidentialTransferAccount") {
        extensionReasons.push("Confidential transfer balance");
      }
    }
  }

  return {
    address: item.pubkey.toBase58(),
    mint: String(info.mint),
    program,
    programId: program === "spl" ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID,
    amountRaw: typeof ta.amount === "string" ? ta.amount : "unknown",
    uiAmount: typeof ta.uiAmount === "number" ? ta.uiAmount : Number(ta.uiAmountString ?? NaN),
    decimals: typeof ta.decimals === "number" ? ta.decimals : 0,
    lamports: item.account.lamports,
    frozen: info.state === "frozen",
    closeAuthority: typeof info.closeAuthority === "string" ? info.closeAuthority : null,
    extensionReasons,
  };
}

function classify(
  raw: RawAccount,
  owner: string,
  mint: MintData | undefined,
  meta: { symbol: string; name: string } | undefined,
  priceUsd: number | null,
  pnft = false,
): { status: AccountStatus; reasons: string[]; valueUsd: number | null; selectable: boolean } {
  const isZero = raw.amountRaw === "0" && raw.uiAmount === 0;
  const valueUsd = priceUsd !== null && Number.isFinite(raw.uiAmount) ? raw.uiAmount * priceUsd : null;

  // --- Hard blocks: a burn or close would fail or lose funds. Never selectable. ---
  const hard: string[] = [];
  if (raw.frozen && !pnft) hard.push("Account is frozen");
  if (raw.closeAuthority && raw.closeAuthority !== owner) hard.push("Non-standard close authority");
  hard.push(...raw.extensionReasons);
  if (!mint) hard.push("Mint could not be verified");
  if (raw.amountRaw === "unknown") hard.push("Balance could not be read");
  if (raw.mint === WSOL_MINT && !isZero) hard.push("Wrapped SOL balance — unwrap it in your wallet");
  if (hard.length > 0) return { status: "protected", reasons: hard, valueUsd, selectable: false };

  // --- Soft protections: kept out of every default, but the user may pick them to burn and close. ---
  const soft: string[] = [];
  const lst = LST_MINTS[raw.mint];
  if (lst) soft.push(`Liquid staking token (${lst})`);
  const lpByAuthority = mint?.mintAuthority ? LP_MINT_AUTHORITIES[mint.mintAuthority] : undefined;
  const label = `${meta?.symbol ?? ""} ${meta?.name ?? ""}`.trim();
  const lpByName = label.length > 0 && LP_NAME_PATTERNS.some((re) => re.test(label));
  if (lpByAuthority) soft.push(`LP token (${lpByAuthority})`);
  else if (lpByName) soft.push("Looks like an LP or pool token");
  if (mint && mint.decimals === 0 && mint.supply === "1") soft.push("NFT");
  if (soft.length > 0) return { status: "protected", reasons: soft, valueUsd, selectable: true };

  // --- Balance-based classification ---
  if (isZero) return { status: "empty", reasons: [], valueUsd: 0, selectable: true };
  if (valueUsd === null) {
    return { status: "protected", reasons: ["No reliable price — value can't be verified"], valueUsd, selectable: true };
  }
  if (valueUsd >= VALUE_THRESHOLD_USD) {
    return { status: "protected", reasons: [`Worth about $${valueUsd.toFixed(2)}`], valueUsd, selectable: true };
  }
  return { status: "dust", reasons: ["Burn the leftover balance, then close"], valueUsd, selectable: true };
}

export function computeTotals(accounts: ScannedAccount[], selected?: Set<string>): ScanTotals {
  const t: ScanTotals = {
    accounts: accounts.length,
    empty: 0,
    dust: 0,
    protected: 0,
    closable: 0,
    burns: 0,
    reclaimableLamports: 0,
    feeLamports: 0,
    netLamports: 0,
  };
  for (const a of accounts) {
    t[a.status] += 1;
    // Without a selection, totals describe the default: empty accounts only.
    const counted = selected ? a.closable && selected.has(a.address) : a.status === "empty";
    if (counted) {
      t.closable += 1;
      t.reclaimableLamports += a.lamports;
      if (a.burn) t.burns += 1;
    }
  }
  t.feeLamports = feeFor(t.reclaimableLamports);
  t.netLamports = t.reclaimableLamports - t.feeLamports;
  return t;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Scan a wallet. Progress is reported per completed network step so the UI
 * can show a real progress bar rather than a spinner.
 */
export async function scanWallet(
  connection: Connection,
  owner: PublicKey,
  onProgress?: (p: ScanProgress) => void,
): Promise<ScanResult> {
  const ownerStr = owner.toBase58();
  const report = (phase: ScanPhase, label: string, fraction: number) =>
    onProgress?.({ phase, label, fraction: Math.min(1, Math.max(0, fraction)) });

  report("token", "Scanning SPL Token accounts", 0.04);
  const spl = await connection.getParsedTokenAccountsByOwner(
    owner,
    { programId: new PublicKey(TOKEN_PROGRAM_ID) },
    "confirmed",
  );

  report("token2022", "Scanning Token-2022 accounts", 0.3);
  const t22 = await connection.getParsedTokenAccountsByOwner(
    owner,
    { programId: new PublicKey(TOKEN_2022_PROGRAM_ID) },
    "confirmed",
  );

  const raws: RawAccount[] = [];
  for (const item of spl.value) {
    const r = readTokenAccount(item, "spl", ownerStr);
    if (r) raws.push(r);
  }
  for (const item of t22.value) {
    const r = readTokenAccount(item, "token2022", ownerStr);
    if (r) raws.push(r);
  }

  const mints = [...new Set(raws.map((r) => r.mint))];
  report("mints", `Reading ${mints.length.toLocaleString("en-US")} token mints`, 0.5);
  // Mint data and the DAS asset sweep (names, known prices, cNFTs) run side by side.
  const [mintData, sweep] = await Promise.all([
    mints.length > 0 ? fetchMints(connection, mints) : Promise.resolve(new Map<string, MintData>()),
    sweepAssets(connection.rpcEndpoint, ownerStr, raws.length).catch(() => null),
  ]);

  report("market", "Fetching prices and token names", 0.75);
  // NFTs: accounts holding exactly 1 of a 0-decimal, supply-1 mint.
  const nftCandidates = raws.filter((r) => {
    const md = mintData.get(r.mint);
    return r.amountRaw === "1" && md?.decimals === 0 && md.supply === "1";
  });
  const nftsP = nftCandidates.length > 0
    ? fetchNftInfo(connection, nftCandidates.map((r) => ({ mint: r.mint, tokenAccount: r.address, programId: r.programId }))).catch(() => new Map<string, NftInfo>())
    : Promise.resolve(new Map<string, NftInfo>());
  // Compressed NFTs (needs an RPC with the DAS API; silently skipped otherwise).
  const cnftsP = fetchCnfts(connection, ownerStr, sweep?.compressed).catch(() => []);

  // Prices: Jupiter for every non-zero balance, within a time budget. SOL rides
  // along in the first request. Where the RPC also has a price we keep the
  // higher one, so a token is never under-valued into the burnable "dust" bucket.
  // Anything still unpriced stays protected.
  const held = [...new Set(raws.filter((r) => r.amountRaw !== "0").map((r) => r.mint))];
  const pricedMints = [WSOL_MINT, ...held];
  const jup = await fetchPrices(pricedMints);
  const prices = new Map(jup);
  for (const [mint, p] of sweep?.prices ?? []) prices.set(mint, Math.max(p, jup.get(mint) ?? 0));

  // Names/logos only matter for rows a user can act on or needs to recognise:
  // empty accounts (LP name check) and priced balances. DAS covers nearly all
  // of them; Jupiter fills the gaps.
  const meta = new Map<string, TokenMeta>(sweep?.meta ?? []);
  const metaMints = [...new Set(raws.filter((r) => (r.amountRaw === "0" || prices.has(r.mint)) && !meta.has(r.mint)).map((r) => r.mint))];
  if (metaMints.length > 0) for (const [k, v] of await fetchTokenMeta(metaMints)) meta.set(k, v);
  const solPriceUsd = prices.get(WSOL_MINT) ?? null;

  report("market", "Looking for NFTs", 0.88);
  const [nfts, cnfts] = await Promise.all([nftsP, cnftsP]);

  const accounts: ScannedAccount[] = raws.map((raw) => {
    const m = meta.get(raw.mint);
    const price = prices.get(raw.mint) ?? null;
    const nft = nfts.get(raw.address);
    const pnft = nft?.tokenStandard === TokenStandard.ProgrammableNonFungible;
    const { status, reasons, valueUsd, selectable } = classify(raw, ownerStr, mintData.get(raw.mint), m, price, pnft);
    const extra = nft ? nft.sources.reduce((sum: number, x: RentSource) => sum + x.lamports, 0) : 0;
    return {
      kind: nft ? "nft" : "token",
      ...(nft ? { nft } : {}),
      address: raw.address,
      mint: raw.mint,
      program: raw.program,
      programId: raw.programId,
      amountRaw: raw.amountRaw,
      uiAmount: raw.uiAmount,
      decimals: raw.decimals,
      // For NFTs: token account + metadata + edition (+ token record) rent.
      lamports: raw.lamports + extra,
      frozen: raw.frozen,
      closeAuthority: raw.closeAuthority,
      symbol: m?.symbol ?? nft?.name ?? "",
      name: m?.name ?? nft?.name ?? "",
      logo: m?.logo ?? null,
      priceUsd: price,
      valueUsd,
      status,
      reasons,
      // Protected accounts are selectable only by hand (never by default or "Add dust").
      closable: selectable,
      burn: selectable && raw.amountRaw !== "0",
    };
  });

  for (const c of cnfts) {
    accounts.push({
      kind: "cnft",
      cnft: c.info,
      address: c.id,
      mint: c.id,
      program: "spl",
      programId: "",
      amountRaw: "1",
      uiAmount: 1,
      decimals: 0,
      lamports: 0,
      frozen: false,
      closeAuthority: null,
      symbol: c.name,
      name: c.name,
      logo: c.image,
      priceUsd: null,
      valueUsd: null,
      status: "protected",
      reasons: ["Compressed NFT — no rent to reclaim"],
      closable: true,
      burn: true,
    });
  }

  // Stable order: closable first (largest rent first), then the rest by value.
  const rank: Record<AccountStatus, number> = { empty: 0, dust: 1, protected: 2 };
  accounts.sort((a, b) => rank[a.status] - rank[b.status] || b.lamports - a.lamports || (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

  report("done", "Scan complete", 1);
  return { owner: ownerStr, accounts, totals: computeTotals(accounts), solPriceUsd, scannedAt: Date.now() };
}
