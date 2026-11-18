/**
 * FAQ content. One array feeds both the visible accordion (components/landing/Faq)
 * and the FAQPage structured data on /faq, so they can never drift apart.
 * Numbers come from lib/config.
 */
import { FEE_PERCENT_LABEL, MAX_CLOSES_PER_TX, VALUE_THRESHOLD_USD } from "@/lib/config";

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Why does an empty token account hold SOL?",
    a: "Every account on Solana must hold a minimum balance, called rent, to stay open. A standard token account opened today holds about 0.0015 SOL; older ones opened under the earlier rate hold about 0.00204 SOL. When you sell or send all of a token, the account stays open and the rent stays locked in it until the account is closed.",
  },
  {
    q: "How much will I get back?",
    a: `Whatever each account actually holds: about 0.0015 SOL for a standard account opened today, about 0.00204 SOL for older ones, a little more for some Token-2022 accounts. You receive that rent minus the ${FEE_PERCENT_LABEL} service fee and the network fee. The exact numbers are shown before you sign.`,
  },
  {
    q: "How is the fee charged?",
    a: `As a SOL transfer inside each close transaction, equal to ${FEE_PERCENT_LABEL} of the rent that transaction returns, rounded down to the lamport. Because it's part of the same transaction, it's only paid if the closes succeed. The fee wallet is public and linked in the footer.`,
  },
  {
    q: "Can this touch my tokens or NFTs?",
    a: `Not unless you choose to. Empty accounts are selected by default and only closed. Dust under $${VALUE_THRESHOLD_USD}, other tokens, NFTs and compressed NFTs can be burned too, but only when you tick them yourself, and you confirm every burn by name before your wallet opens. Frozen accounts and wrapped SOL can never be selected. There are no token transfers or approvals.`,
  },
  {
    q: "Why are some empty accounts marked protected?",
    a: "Empty accounts are still protected if they belong to an NFT, LP or liquid staking mint, are frozen, have a close authority other than you, or hold withheld Token-2022 fees. We'd rather leave a few lamports behind than close something unusual.",
  },
  {
    q: "What happens if a transaction fails?",
    a: `Nothing is closed in that transaction and no fee is taken for it. Accounts are processed in transactions of up to ${MAX_CLOSES_PER_TX}; if one fails, the rest still go through, and the result screen lists which succeeded with Solscan links.`,
  },
  {
    q: "Which wallets work?",
    a: "Phantom, Solflare, Backpack, Coinbase Wallet and other Solana wallets that support the Wallet Standard, including inside the Phantom and Solflare mobile browsers.",
  },
];
