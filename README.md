# SolCleanup

Non-custodial Solana dApp that finds empty SPL Token and Token-2022 accounts and closes them to return their rent (~0.00204 SOL each), with a transparent service fee settled atomically in the same transaction.

## Setup

```bash
npm install
cp .env.example .env.local   # then set NEXT_PUBLIC_RPC_URL to your Helius URL
npm run dev
```

`NEXT_PUBLIC_RPC_URL` is **required in production**: the public mainnet RPC rejects browser requests (HTTP 403). Restrict the Helius key to your domain in the Helius dashboard, since it is visible to the browser.

Deploy: push to Vercel and set `NEXT_PUBLIC_RPC_URL` (and optionally `NEXT_PUBLIC_GITHUB_URL`, `NEXT_PUBLIC_X_URL`) in project settings. No other config.

### Before launch

See **[LAUNCH.md](LAUNCH.md)**: fresh keys, deployment, environment variables and a small real-money test.

## Development helpers

- `npm run scan -- <address>`: runs the scanner from the terminal and prints the classification table and totals.
- Without `NEXT_PUBLIC_RPC_URL`, dev builds route RPC through `app/api/rpc` (a read/simulate/send allowlist proxy to the public RPC, no keys, returns 404 in production).
- `/app?watch=<address>` (dev only) previews the dashboard read-only for any wallet, with closing disabled.

## Layout

```
lib/config.ts      FEE_WALLET, FEE_BPS, limits, program IDs: single source of truth
lib/scan.ts        fetch both token programs, mints, prices; classify + totals
lib/close.ts       batching (22/tx), v0 tx builder, priority fee, CU simulation,
                   pre-flight re-check, sign-all + send + polling confirmation
lib/errors.ts      decode simulation/RPC/wallet errors into plain sentences
lib/market.ts      Jupiter price + token metadata (rate-limited, mint addresses only)
lib/protected.ts   LST mints, LP mint authorities, LP name heuristics
hooks/             React glue (useScan, useClose state machine)
components/app/    dashboard, table, close-flow modals, result screen
components/landing hero, address check, sticky how-it-works, fees, safety, FAQ
```

## Transaction anatomy

Each batch is one v0 transaction:

1. `ComputeBudget.setComputeUnitLimit`: simulated units × 1.15 + 2,000
2. `ComputeBudget.setComputeUnitPrice`: p75 of recent non-zero prioritization fees for the touched accounts, clamped to 1,000–500,000 µ-lamports
3. `closeAccount` × ≤ 22: destination = owner, authority = owner
4. `SystemProgram.transfer` → `FEE_WALLET`: `floor(rentInBatch × FEE_BPS / 10_000)`

Every batch is simulated at review time and again with a fresh blockhash right before the signature prompt. Failed simulations never reach the wallet.

## Safety rules (enforced in `lib/scan.ts` / `lib/close.ts`)

- Empty accounts (raw balance `"0"`) are `closable` and selected by default. Dust (priced, under $2) is `closable` with `burn: true`: opt-in only, burned with `burnChecked` for exactly the scanned amount, then closed in the same transaction. A burn costs 3 of the 22 per-transaction slots.
- Default selection = empty accounts only; nothing else has an enabled checkbox.
- Protected (never selectable): frozen, non-owner close authority, Token-2022 withheld fees / confidential balances, LSTs, LP tokens, NFTs (decimals 0 + supply 1), unverifiable mints, wrapped SOL balances, unpriced non-zero balances, value ≥ $2.
- Pre-flight: selected accounts are re-read right before signing; an empty account that gained a balance, a dust account whose balance changed, an owner change, freeze or missing account blocks the action and names the token.
- No backend holding keys, no analytics on wallet contents.

## Verified so far

- Scanner + classification against a live mainnet wallet with 3,175 accounts (28 closable, NFTs, frozen, LST, LP and withheld-fee accounts flagged).
- Batch simulation against mainnet: a 22-close batch simulates at ~30k CU, 25 instructions.
- Landing, address check and dashboard rendered in a browser at 1440px and 375px (no horizontal overflow).
- Lighthouse (production build, mobile emulation): `/` Performance 90–91, Accessibility 100, Best Practices 100, SEO 100; `/app` Performance 95, Accessibility 100.

Not yet verified: an actual signed close on mainnet with a real wallet (Phantom/Solflare/Backpack/Coinbase), and the in-app wallet browsers.
