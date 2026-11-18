/**
 * SolCleanup configuration — the single source of truth for fees, limits and
 * program addresses. Anything that changes what a user pays lives here.
 */

/** Service fee destination. Shown publicly in the footer and before signing. */
export const FEE_WALLET = "HXFZid9dFdTa2ARCf7MktM2xQaw9hguxX1Aoaa9Shamp";

/** Service fee in basis points of the rent reclaimed in each transaction. 800 = 8%. */
export const FEE_BPS = 800; // 8% — single source of truth, easy to change

/**
 * Referrals: share of the service fee (not extra) paid to the referrer, in
 * basis points of the fee. 2500 = 25% of the 8% fee = 2% of the rent. Paid by
 * a second transfer in the same transaction; the user pays the same 8%.
 */
export const REFERRAL_SHARE_BPS = 2500;
/**
 * Partner wallets with a custom share of the fee (basis points of the fee).
 * The user still pays the same 8%; only the split between the fee wallet and
 * the referrer changes. 4000 = 40% of the fee = 3.2% of the rent.
 */
export const REFERRAL_SHARE_OVERRIDES: Readonly<Record<string, number>> = {
  "38u6NGpSwadrD8VVtFo9LiDdqj4Mt9xmz4Kbt2kSWEuE": 4000,
  "BAr68J6AojVHar4hJXgaLM25HRKHN96DAJCDwPYpgCGP": 4000,
};
/** The referral share for a given referrer wallet, in basis points of the fee. */
export const referralShareBps = (wallet?: string | null): number =>
  (wallet && REFERRAL_SHARE_OVERRIDES[wallet]) || REFERRAL_SHARE_BPS;
/** Referral codes: 3–16 lowercase letters, digits, "_" or "-". Users may pick their own. */
export const REFERRAL_CODE_RE = /^[a-z0-9_-]{3,16}$/;
/**
 * Message a wallet signs to change its referral code (checked server-side,
 * valid 10 minutes). It names the site's domain, so a signature collected by
 * a look-alike site is rejected here.
 */
export const referralCodeMessage = (domain: string, wallet: string, code: string, issuedAt: number) =>
  `${domain} wants you to confirm your SolCleanup referral code.\n\nCode: ${code}\nWallet: ${wallet}\nIssued: ${issuedAt}\n\nThis only proves you own the wallet. It costs nothing and moves no funds.`;

/** Max close instructions per transaction. Keeps v0 transactions under the 1232-byte limit. */
export const MAX_CLOSES_PER_TX = 22;

/**
 * Per-transaction budget, in "close slots". An empty account uses 1 slot; a
 * dust account uses BURN_SLOT_COST because it adds a burn instruction and its
 * mint key. 22 empties, or 7 dust burns, both stay well under 1232 bytes.
 */
export const BURN_SLOT_COST = 3;

/**
 * Accounts holding a token worth at least this much (USD) are protected and
 * never touched. Below it, a priced balance is "dust": the user may opt in to
 * burn it and close the account.
 */
export const VALUE_THRESHOLD_USD = 2;

/** Program IDs. */
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const WSOL_MINT = "So11111111111111111111111111111111111111112";

/** Base fee per signature, in lamports. */
export const LAMPORTS_PER_SIGNATURE = 5000;

/** Priority fee bounds (micro-lamports per compute unit). */
export const PRIORITY_FEE_MIN = 1_000;
export const PRIORITY_FEE_MAX = 500_000;
/** Percentile of recent non-zero prioritization fees to pay. */
export const PRIORITY_FEE_PERCENTILE = 0.75;

/** Compute unit padding applied to the simulated value. */
export const CU_PADDING_RATIO = 1.15;
export const CU_PADDING_FLAT = 2_000;
/** Used only while simulating to measure real consumption. */
export const CU_SIMULATION_LIMIT = 1_400_000;

/** Rows per page in the dashboard table. Keeps 500+ account wallets responsive. */
export const PAGE_SIZE = 50;

/**
 * RPC endpoint, from NEXT_PUBLIC_RPC_URL. Without it, development builds use
 * the local /api/rpc proxy (see app/api/rpc/route.ts) and production falls
 * back to the public endpoint, which rejects browser requests — so a real
 * RPC URL is required for deployment.
 */
export const RPC_IS_FALLBACK = !process.env.NEXT_PUBLIC_RPC_URL;

export const RPC_URL = !RPC_IS_FALLBACK
  ? (process.env.NEXT_PUBLIC_RPC_URL as string)
  : "https://api.mainnet-beta.solana.com";

/** Resolve the endpoint in the browser (dev proxy needs the page origin). */
export function resolveRpcUrl(): string {
  if (RPC_IS_FALLBACK && process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    return `${window.location.origin}/api/rpc`;
  }
  return RPC_URL;
}

/** Third-party read-only APIs (no wallet data beyond public mints is sent). */
export const JUPITER_PRICE_URL = "https://lite-api.jup.ag/price/v3";
export const JUPITER_TOKENS_URL = "https://lite-api.jup.ag/tokens/v2/search";

/** Footer links. Empty strings are hidden. */
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL ?? "";
export const X_URL = process.env.NEXT_PUBLIC_X_URL ?? "";

export const solscanAccount = (address: string) => `https://solscan.io/account/${address}`;
export const solscanTx = (signature: string) => `https://solscan.io/tx/${signature}`;
export const solscanToken = (mint: string) => `https://solscan.io/token/${mint}`;

/** Fee as a human percentage string, e.g. "8%". */
export const FEE_PERCENT_LABEL = `${(FEE_BPS / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
