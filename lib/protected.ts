/**
 * Mints and authorities that SolCleanup refuses to touch, regardless of balance.
 * Each entry is a public on-chain address; reasons are shown to the user.
 */

/** Liquid staking tokens. */
export const LST_MINTS: Record<string, string> = {
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "mSOL",
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: "JitoSOL",
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: "bSOL",
  "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm": "INF",
  jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v: "JupSOL",
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": "stSOL",
  he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A: "hSOL",
};

/**
 * Mint authorities of AMM programs whose LP tokens we protect. LP mints are
 * created with the pool's authority as mint authority, so matching on it
 * catches every pool of that program.
 */
export const LP_MINT_AUTHORITIES: Record<string, string> = {
  // Raydium AMM v4 authority
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1": "Raydium LP",
  // Raydium CPMM authority
  GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL: "Raydium CPMM LP",
};

/**
 * Name/symbol patterns that indicate an LP or pool share token. Used as a
 * secondary heuristic for Orca and Meteora, whose LP mint authorities are
 * per-pool PDAs.
 */
export const LP_NAME_PATTERNS: RegExp[] = [
  /\bLP\b/i,
  /liquidity/i,
  /\bwhirlpool\b/i,
  /\borca\b.*\b(pool|aquafarm)\b/i,
  /\bmeteora\b/i,
  /\braydium\b/i,
  /\bpool token\b/i,
  /-LP$/i,
];
