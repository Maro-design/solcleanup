/**
 * The three steps on /how-it-works. One array feeds the visible page and the
 * HowTo structured data, so they can't drift. Numbers come from lib/config.
 */
import { FEE_PERCENT_LABEL, MAX_CLOSES_PER_TX, VALUE_THRESHOLD_USD } from "@/lib/config";

export interface HowStep {
  title: string;
  text: string;
}

export const HOW_STEPS: HowStep[] = [
  {
    title: "Scan",
    text: `SolCleanup reads every account your wallet owns under both Solana token programs, then checks each token's price and settings. Accounts holding zero tokens are marked empty, and balances worth under $${VALUE_THRESHOLD_USD} are marked dust you can choose to burn. Anything worth $${VALUE_THRESHOLD_USD} or more, plus NFTs, LP and staking tokens and unusual accounts, is marked protected and is never picked for you.`,
  },
  {
    title: "Review",
    text: `Before your wallet opens, you see exactly what you get: the rent, the ${FEE_PERCENT_LABEL} service fee, the estimated network fee and the net amount. The selected accounts are read again to confirm they're still empty, and every transaction is simulated against the live chain.`,
  },
  {
    title: "Sign once",
    text: `Accounts close in transactions of up to ${MAX_CLOSES_PER_TX}. The fee is paid inside the same transaction as the closes, so it can only be paid if they succeed. One approval covers every transaction, and each one links to Solscan when it lands.`,
  },
];
