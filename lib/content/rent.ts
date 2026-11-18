/**
 * Solana rent figures used in copy. Read from mainnet's Rent sysvar and
 * getMinimumBalanceForRentExemption on 2026-11-18. The app itself never uses
 * these: scans and transactions always use each account's real lamports.
 */
export const RENT_CHECKED = "2026-11-18";
/** Current mainnet parameters. */
export const LAMPORTS_PER_BYTE_YEAR = 5_080;
export const EXEMPTION_YEARS = 1;
/** Fixed per-account overhead counted by the rent formula. */
export const ACCOUNT_OVERHEAD_BYTES = 128;

export const rentExempt = (dataBytes: number) => (dataBytes + ACCOUNT_OVERHEAD_BYTES) * LAMPORTS_PER_BYTE_YEAR * EXEMPTION_YEARS;

/** A standard SPL token account (165 bytes) opened today. */
export const TOKEN_ACCOUNT_RENT = rentExempt(165); // 1,488,440
/** What token accounts opened under the earlier rate hold (3,480 lamports/byte-year, 2 years). */
export const LEGACY_TOKEN_ACCOUNT_RENT = 2_039_280;
/** A Token-2022 account with the ImmutableOwner extension (170 bytes), as created for associated accounts. */
export const TOKEN_2022_ACCOUNT_RENT = rentExempt(170); // 1,513,840
/** A mint account (82 bytes). */
export const MINT_RENT = rentExempt(82); // 1,066,800

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const sol = (lamports: number, digits = 8) =>
  (lamports / LAMPORTS_PER_SOL).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
export const lamportsLabel = (n: number) => n.toLocaleString("en-US");
