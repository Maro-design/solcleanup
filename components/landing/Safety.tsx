import { Reveal } from "@/components/ui/Reveal";
import { FEE_PERCENT_LABEL, VALUE_THRESHOLD_USD } from "@/lib/config";

interface Rule {
  title: string;
  body: string;
}

/** Eight rules in three groups a visitor can hold in their head. */
const GROUPS: { title: string; rules: Rule[] }[] = [
  {
    title: "Your keys and your data",
    rules: [
      {
        title: "Keys never leave your wallet",
        body: "No seed phrase, no private key. Transactions are built in your browser and signed by your wallet. No server holds anything.",
      },
      {
        title: "No tracking of wallet contents",
        body: "No analytics on what you hold. Price and name lookups send only public token addresses.",
      },
    ],
  },
  {
    title: "What can be closed",
    rules: [
      {
        title: "Only zero-balance accounts",
        body: "Empty accounts are selected by default. Dust under $2 is only burned if you add it yourself, and the review names every token before you sign.",
      },
      {
        title: "Nothing with value is pre-selected",
        body: "The default selection is empty accounts only. Dust, tokens, NFTs and cNFTs are burned only when you tick them, and you confirm the burn by name.",
      },
      {
        title: "NFTs, LP and staking tokens are off-limits",
        body: `NFTs, LP and staking tokens and anything worth $${VALUE_THRESHOLD_USD} or more are flagged and never picked for you. Frozen accounts and wrapped SOL are locked completely.`,
      },
      {
        title: "Unusual accounts are skipped",
        body: "Frozen accounts, accounts with a close authority that isn't you, and Token-2022 accounts holding withheld fees are left alone.",
      },
    ],
  },
  {
    title: "The moment you sign",
    rules: [
      {
        title: "Re-checked, then simulated",
        body: "Every selected account is read again right before signing. If one now holds a balance, the action stops and names the token. A transaction that fails simulation never reaches your wallet.",
      },
      {
        title: "The fee can't be taken on its own",
        body: `The ${FEE_PERCENT_LABEL} fee is paid inside the same transaction as the closes. If the transaction fails, no fee moves.`,
      },
    ],
  },
];

export function Safety() {
  return (
    <section id="safety" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-6" aria-labelledby="safety-title">
      <Reveal>
        <h2 id="safety-title" className="heading max-w-[720px] text-32 font-medium text-hi md:text-48">
          Built so you can&apos;t lose anything that matters
        </h2>
        <p className="mt-6 max-w-[560px] text-16 text-mid">
          The only thing SolCleanup closes is an account that holds nothing. These rules are enforced in code, not in copy.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-12 border-t border-line pt-12 md:mt-16 lg:grid-cols-3 lg:gap-16">
        {GROUPS.map((g, gi) => (
          <Reveal key={g.title} delay={gi * 0.06}>
            <h3 className="text-20 font-medium text-hi">{g.title}</h3>
            <ul className="mt-6 space-y-6">
              {g.rules.map((r) => (
                <li key={r.title}>
                  <p className="text-16 text-hi">{r.title}</p>
                  <p className="mt-1 text-14 text-mid">{r.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
