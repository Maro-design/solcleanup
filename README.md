# SolCleanup

SolCleanup finds the empty token accounts in a Solana wallet and closes them,
so the SOL rent they hold goes back to the wallet. It is non-custodial: every
transaction is built in your browser and signed by your own wallet, and the
service fee is shown before you sign.

Live at **https://solcleanup.xyz**.

---

## Note for wallet security reviewers

**SolCleanup deploys no on-chain program.** It is a web front end that builds
standard instructions for existing programs and asks the user's wallet to sign
them.

These are the **only** instructions it ever builds:

| Instruction | Program | When |
|---|---|---|
| `setComputeUnitLimit`, `setComputeUnitPrice` | Compute Budget | Every transaction |
| `closeAccount` | SPL Token / Token-2022 | Every token account being closed. **Destination and authority are always the owner.** |
| `burnChecked` | SPL Token / Token-2022 | Only for a balance the user explicitly chose to burn, for exactly the scanned amount |
| `BurnV1` (instruction 41) | Metaplex Token Metadata | Only for an NFT the user explicitly chose to burn. Authority is the owner, so released rent returns to the owner |
| `burn` | Metaplex Bubblegum | Only for a compressed NFT the user explicitly chose to burn (returns no rent, carries no fee) |
| `transfer` | System Program | The disclosed service fee to the public fee wallet, plus, with a referral link, part of that same fee to the referrer |

And these are instructions it **never** builds, anywhere in the code:

- `approve` / `approveChecked`
- `revoke`
- `setAuthority`
- token `transfer` / `transferChecked`
- any delegation, mint, freeze or account-initialization instruction

The instruction builders are in [`lib/close.ts`](lib/close.ts) (`buildInstructions`),
[`lib/nft.ts`](lib/nft.ts) (`createBurnNftInstruction`) and
[`lib/cnft.ts`](lib/cnft.ts) (`createBurnCnftInstruction`). The security
policy is in [SECURITY.md](SECURITY.md).

---

## Transaction anatomy

Accounts are grouped into v0 transactions of up to 22 "slots" (an empty
account uses 1, an account that is burned first uses 3), with a serialized
size check against the 1,232-byte limit. Each transaction contains:

1. `ComputeBudget.setComputeUnitLimit`: the simulated units, padded.
2. `ComputeBudget.setComputeUnitPrice`: the 75th percentile of recent
   prioritization fees for the touched accounts, clamped to 1,000–500,000
   micro-lamports.
3. For each selected account, in order:
   - empty token account: `closeAccount` (destination = owner, authority = owner);
   - dust or a token the user picked: `burnChecked` for the exact scanned
     amount, then `closeAccount`;
   - NFT the user picked: Token Metadata `BurnV1`, which closes the token,
     metadata and edition accounts (and the token record for programmable NFTs);
   - compressed NFT the user picked: Bubblegum `burn` with a fresh Merkle proof.
4. `SystemProgram.transfer` to the fee wallet:
   `floor(rentReturnedInThisTransaction × FEE_BPS / 10,000)`.
   With a referral link, that same fee is split into two transfers: the
   referrer's share and the rest to the fee wallet. The user pays the same
   total either way.

Because the fee is in the same transaction as the closes, it is only paid if
they succeed.

## Fee

- **5% of the rent each transaction returns** (`FEE_BPS = 500` in
  [`lib/config.ts`](lib/config.ts)), rounded down to the lamport.
- No fee on compressed-NFT burns, which return no rent.
- Fee wallet:
  [`HXFZid9dFdTa2ARCf7MktM2xQaw9hguxX1Aoaa9Shamp`](https://solscan.io/account/HXFZid9dFdTa2ARCf7MktM2xQaw9hguxX1Aoaa9Shamp)
- Referrals: a share of the fee (25% by default) goes to the referrer in the
  same transaction. A wallet can't refer itself. If the referrer's wallet is
  empty and its share is below the rent-exempt minimum, the whole fee goes to
  the fee wallet instead of failing the claim.

## What is protected

Every account is classified in [`lib/scan.ts`](lib/scan.ts) (`classify`).

**Selected by default:** only empty accounts (raw balance exactly zero).

**Never selectable at all** (the checkbox is disabled):

- frozen accounts (except programmable NFTs, which are frozen by design and
  burned through Token Metadata);
- accounts whose close authority is someone other than the owner;
- Token-2022 accounts holding withheld transfer fees or a confidential balance;
- accounts whose mint can't be read, or whose balance can't be read;
- wrapped SOL accounts that still hold SOL.

**Protected: never selected for you; the user can tick them one by one to
burn and close, and confirms each burn by name before the wallet opens:**

- liquid staking tokens (mSOL, JitoSOL, bSOL, INF, JupSOL, stSOL, hSOL);
- LP tokens: Raydium AMM v4 and CPMM pools (matched by mint authority) and
  Orca, Meteora and other pools (matched by name);
- NFTs and compressed NFTs;
- any balance without a reliable price;
- any balance worth **$2 or more**.

**Dust:** a priced balance worth under $2. Only included if the user adds it
("Add dust") or ticks it; it is burned and then closed.

The full lists live in [`lib/protected.ts`](lib/protected.ts) and the
threshold in `VALUE_THRESHOLD_USD` in [`lib/config.ts`](lib/config.ts).

## Simulation and pre-flight checks

1. **Pre-flight.** Right before planning, every selected account is read
   again from the chain. If an account now holds a balance, a burned balance
   changed, the owner changed, it was frozen or it no longer exists, nothing
   is signed and the user sees which token changed.
2. **Planning.** Every transaction is simulated. The rent actually released
   is measured from the simulated post-balances, and the fee is computed from
   that measured amount.
3. **Before the signature prompt.** Every transaction is rebuilt with a fresh
   blockhash and simulated again. A transaction that fails either simulation
   never reaches the wallet.

## Privacy

- Keys and seed phrases are never requested.
- The wallet address goes to the Solana RPC (as it does for any wallet app).
  Price and name lookups send only public token mint addresses to Jupiter.
- The server stores referral codes with the referrer's wallet, and for each
  referred claim only its transaction signature and amounts. The claiming
  wallet is not stored. Rate limiting uses hashed IP addresses.
- Shareable `/check/<address>` pages show aggregate numbers only (no token
  names or balances), are never indexed by search engines, and cache those
  numbers for five minutes.

## Setup

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

Fill in `.env.local` (every variable is documented in
[`.env.example`](.env.example)):

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap and link previews. **Required for production builds.** |
| `NEXT_PUBLIC_RPC_URL` | Browser RPC. Use a Helius (or other DAS-capable) URL whose key is locked to your domain. |
| `RPC_URL` | Server RPC for portfolio, referral verification and shareable check pages. |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Referrals and rate limits (schema in [`supabase/migrations`](supabase/migrations)). Optional in development. |
| `RATE_LIMIT_SALT` | Any long random string. |

Without `NEXT_PUBLIC_RPC_URL`, development builds route RPC calls through
`app/api/rpc`, a read/simulate/send allowlist proxy to the public RPC that
returns 404 in production.

Useful commands:

```bash
npm run typecheck
npm run build
npm run scan -- <wallet address>   # classify a wallet from the terminal
```

`/app?watch=<address>` (development only) previews the dashboard read-only for
any wallet, with closing disabled.

## Project layout

```
lib/config.ts       fee, fee wallet, limits, program IDs: single source of truth
lib/scan.ts         read both token programs, mints, prices; classify accounts
lib/close.ts        batching, transaction builder, simulation, pre-flight, sending
lib/nft.ts          NFT detection and Token Metadata BurnV1
lib/cnft.ts         compressed NFTs and Bubblegum burn
lib/protected.ts    liquid staking mints, LP authorities and name patterns
lib/market.ts       Jupiter prices and token names (mint addresses only)
hooks/              React state for scanning and closing
app/api/            referral codes, claim verification, portfolio, dev RPC proxy
supabase/           database schema for referrals and rate limits
```

## License

[MIT](LICENSE)
