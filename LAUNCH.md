# SolCleanup — launch checklist

Everything in the code is done and tested. These are the steps only you can do.

## 1. Make fresh keys (the current ones were shared in a chat)

- **Supabase:** Dashboard → project **solcleanup** → Project Settings → **API Keys** → *Create new secret key*.
  Put it in your hosting env (below), then **delete the old key** there.
- **Helius:** create **two** keys and delete the old one.
  - **Browser key:** Access Control → *Allowed domains* → your domain. Goes in `NEXT_PUBLIC_RPC_URL`.
  - **Server key:** no domain lock. Goes in `RPC_URL`.

## 2. Put the code on GitHub (private repo)

```bash
cd solcleanup
git init && git add . && git commit -m "SolCleanup v1"
```
Then create a **private** repository on GitHub and push. `.env.local` is ignored and will not be uploaded.

## 3. Deploy on Vercel

1. vercel.com → *Add New Project* → import the GitHub repo.
2. *Root Directory*: `solcleanup` (if the repo contains the parent folder).
3. *Environment Variables*, for Production:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_RPC_URL` | Helius **browser** key URL (domain-locked) |
| `RPC_URL` | Helius **server** key URL (no lock) |
| `SUPABASE_URL` | `https://pzvyklzgrciupnjoftnu.supabase.co` |
| `SUPABASE_SECRET_KEY` | the **new** Supabase secret key |
| `RATE_LIMIT_SALT` | any long random text |
| `NEXT_PUBLIC_X_URL` / `NEXT_PUBLIC_GITHUB_URL` | optional footer links |

4. Deploy, then add your domain under *Settings → Domains*. Add that same domain to the Helius browser key's allowed list.

## 4. Test with real money (small)

On the live site, with your own wallet:
1. Close a few **empty** accounts. Check the transaction on Solscan: rent back to you, 8% to the fee wallet.
2. **Burn** one dust token. Confirm the burn card appears first.
3. Open your **Rewards** page, create a code, open your link in another browser with a second wallet, and claim. Check that 25% of the fee lands in the first wallet and that the claim appears on Rewards.
4. Open **Portfolio**: the claims should be listed and charted.

## 5. Keep an eye on

- The **fee wallet** must hold at least 0.001 SOL (it does now).
- **Supabase** free plan pauses after a week of no activity. Upgrade, or visit the dashboard, before that happens.
- **Helius** usage in its dashboard, when traffic grows.

## Known limits (by design)

- The fee is part of a transaction built in the user's browser. Someone editing the site's code locally could leave it out. This is true of every non-custodial cleaner.
- A user can refer themselves from a second wallet and get 25% of the fee back.
- `npm audit` lists `sharp` (unused: image optimisation is off) and `bigint-buffer` (inside Solana's token library, no fix available). Neither is reachable in this app.
