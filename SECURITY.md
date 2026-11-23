# Security policy

## Reporting a vulnerability

Please email **<SECURITY_EMAIL>** with a description, the steps to reproduce,
and the transaction or wallet address involved if there is one. Please don't
open a public issue for anything that could put users' funds at risk.

You'll get an acknowledgement within a few days. Once a fix is live, we're
happy to credit you if you'd like.

## Scope

SolCleanup is a **front-end only** application:

- It deploys **no on-chain program**. Every instruction it builds targets an
  existing, widely used program (System, Compute Budget, SPL Token,
  Token-2022, Metaplex Token Metadata, Metaplex Bubblegum).
- It runs **no server that holds keys**. Transactions are built in the
  browser and signed by the user's own wallet.

The small server side (`app/api/*`, `app/check/[address]`) only reads public
chain data, records referral codes, and rate-limits requests. It never sees a
private key and cannot sign anything.

In scope: the code in this repository and the site at https://solcleanup.xyz.
Out of scope: third-party wallets, RPC providers, Jupiter's price API, and the
Solana programs listed above.

## Design guarantees

These are enforced in code (`lib/close.ts`, `lib/scan.ts`, `lib/nft.ts`,
`lib/cnft.ts`). A report showing any of them can be broken is in scope.

1. **No private key or seed phrase** is ever requested, stored, logged or
   transmitted.
2. **No `approve`, `revoke`, `setAuthority`, token `transfer` /
   `transferChecked`, or delegation instruction is ever constructed.** The app
   cannot grant anyone control over a user's tokens.
3. **`closeAccount` always uses the account owner as the rent destination**
   (and as the authority). NFT burns (Token Metadata `BurnV1`) use the owner as
   the authority, so the released rent also returns to the owner.
4. **The only outbound SOL transfers are the disclosed service fee**: one
   `SystemProgram.transfer` to the public fee wallet, and, when the user
   arrived through a referral link, a second transfer of part of that same
   fee to the referrer. The total never exceeds the disclosed fee.
5. **Every transaction is simulated before the signature prompt**, first when
   the plan is built and again with a fresh blockhash immediately before the
   wallet opens. A transaction that fails simulation never reaches the wallet.
6. **Selected accounts are re-read just before signing.** If an account gained
   a balance, changed owner, was frozen or no longer exists, nothing is signed
   and the user is told which token changed.
7. **The fee is atomic with the closes.** It is part of the same transaction,
   so if the transaction fails, nothing is closed and no fee moves.

## Known limitations

- The fee transfer is built in the browser, like every non-custodial cleaner.
  Someone running a modified copy of this code could remove it; that only
  affects their own transactions.
- Token names and prices come from third-party APIs. Missing or unreliable
  data is always treated conservatively (an unpriced balance is protected).
