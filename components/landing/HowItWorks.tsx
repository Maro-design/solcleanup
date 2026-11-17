"use client";

/**
 * The signature scroll moment: the left column (title, step index and an
 * instrument panel) pins while the step copy scrolls past on the right.
 * The active step is whichever text block crosses the viewport centre.
 */
import { AnimatePresence, motion, useInView } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { FEE_PERCENT_LABEL, MAX_CLOSES_PER_TX } from "@/lib/config";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Frosted-glass card on a soft cornflower field: the field gives the glass
 * something to blur, the way a photo sits behind a weather card. Lines and
 * meta text are retuned inside the glass so they read on blue, not beige.
 */
const GLASS_VARS = {
  "--border": "var(--glass-line)",
  "--border-hover": "rgb(var(--shadow-ink) / 0.18)",
  "--text-meta": "var(--glass-meta)",
} as CSSProperties;

function GlassStage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-3xl p-3 sm:p-5 ${className}`}>
      <div aria-hidden className="absolute inset-0 -z-10 [background:var(--glass-field)]" />
      <motion.div
        aria-hidden
        className="absolute -left-[20%] -top-[35%] -z-10 size-[75%] rounded-full bg-[var(--glass-blob-a)] opacity-45 blur-3xl"
        animate={{ x: ["0%", "12%", "0%"], y: ["0%", "8%", "0%"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-[45%] -right-[15%] -z-10 size-[85%] rounded-full bg-[var(--glass-blob-b)] opacity-80 blur-3xl"
        animate={{ x: ["0%", "-10%", "0%"], y: ["0%", "-6%", "0%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        style={GLASS_VARS}
        className="relative rounded-2xl border border-[var(--glass-edge)] bg-[var(--glass-fill)] p-6 shadow-[inset_0_1px_0_var(--glass-edge),0_24px_48px_-16px_rgb(28_52_110/0.35)] backdrop-blur-xl backdrop-saturate-150 sm:p-7"
      >
        {children}
      </div>
    </div>
  );
}

function Dot({ tone }: { tone: "hi" | "warn" | "mid" | "low" }) {
  const c = { hi: "bg-hi", warn: "bg-warn", mid: "bg-mid", low: "bg-low" }[tone];
  return <span className={`size-1.5 shrink-0 rounded-full ${c}`} aria-hidden />;
}

function ScanPanel() {
  const rows: [string, string, string, "hi" | "warn" | "mid" | "low"][] = [
    ["SPL", "Empty", "0.00204", "hi"],
    ["SPL", "Empty", "0.00204", "hi"],
    ["2022", "Empty", "0.00210", "hi"],
    ["SPL", "NFT, protected", "0.00204", "low"],
    ["SPL", "$41 balance, protected", "0.00204", "warn"],
    ["SPL", "Dust, $0.12", "0.00204", "mid"],
  ];
  return (
    <div className="font-mono text-12">
      <p className="mb-3 flex justify-between text-meta">
        <span>Both token programs</span>
        <span>rent, SOL</span>
      </p>
      <ul className="divide-y divide-line">
        {rows.map(([prog, status, rent, tone], i) => (
          <li key={i} className="flex items-center gap-3 py-2">
            <Dot tone={tone} />
            <span className="w-10 shrink-0 text-meta">{prog}</span>
            <span className={`min-w-0 flex-1 ${tone === "hi" ? "text-hi" : "text-mid"}`}>{status}</span>
            <span className="text-mid tnum">{rent}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewPanel() {
  const checks = [
    "28 selected accounts re-read: still empty",
    "2 transactions simulated: both pass",
    "Rent goes to your wallet",
    `${FEE_PERCENT_LABEL} fee goes to the public fee wallet`,
    "No token transfers or approvals; burns only for dust you chose",
  ];
  return (
    <div className="text-14">
      <p className="mb-3 font-mono text-12 text-meta">Before your wallet opens</p>
      <ul className="space-y-3">
        {checks.map((c) => (
          <li key={c} className="flex items-start gap-3 text-mid">
            <Check size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-hi" aria-hidden />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignPanel() {
  const ixs: [string, string][] = [
    ["Budget", "Set compute limit"],
    ["Budget", "Set priority fee"],
    ["Token", `Close account × ${MAX_CLOSES_PER_TX}`],
    ["System", `Pay ${FEE_PERCENT_LABEL} fee`],
  ];
  return (
    <div className="font-mono text-12">
      <p className="mb-3 text-meta">One transaction</p>
      <div className="border-l border-line-hover pl-4">
        <ol className="space-y-2">
          {ixs.map(([program, ix], i) => (
            <li key={i} className="flex gap-3">
              <span className="w-4 shrink-0 text-meta tnum">{i + 1}</span>
              <span className="w-16 shrink-0 text-meta">{program}</span>
              <span className={`min-w-0 ${i >= 2 ? "text-hi" : "text-mid"}`}>{ix}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 font-sans text-14 text-mid">All succeed together, or none do.</p>
      </div>
    </div>
  );
}

const STEPS: { title: string; body: ReactNode; panel: ReactNode }[] = [
  {
    title: "Scan",
    body: (
      <>
        SolCleanup reads every account your wallet owns under both Solana token programs, then checks each token&apos;s
        price and settings. Accounts holding zero tokens are marked empty, and balances worth under $2 are marked dust you can choose to burn. Anything worth $2 or more, plus NFTs, LP and staking
        tokens and unusual accounts, is marked protected and can&apos;t be selected.
      </>
    ),
    panel: <ScanPanel />,
  },
  {
    title: "Review",
    body: (
      <>
        Before your wallet opens, you see exactly what you get: the rent, the {FEE_PERCENT_LABEL} service fee, the estimated
        network fee and the net amount. The selected accounts are read again to confirm they&apos;re still empty, and every
        transaction is simulated against the live chain.
      </>
    ),
    panel: <ReviewPanel />,
  },
  {
    title: "Sign once",
    body: (
      <>
        Accounts close in transactions of up to {MAX_CLOSES_PER_TX}. The fee is paid inside the same transaction as the closes,
        so it can only be paid if they succeed. One approval covers every transaction, and each one links to Solscan when it
        lands.
      </>
    ),
    panel: <SignPanel />,
  },
];

function StepText({ index, onActive, children, title }: { index: number; onActive: (i: number) => void; children: ReactNode; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  const last = index === STEPS.length - 1;
  return (
    <div ref={ref} className={`lg:pt-24 ${last ? "lg:min-h-[48vh]" : "lg:min-h-[64vh]"}`}>
      <h3 className="heading text-32 font-medium text-hi">
        <span className="mr-3 font-mono text-20 text-meta tnum lg:hidden" aria-hidden>
          {index + 1}
        </span>
        {title}
      </h3>
      <p className="mt-4 max-w-[480px] text-16 text-mid">{children}</p>
      {/* On small screens the panel sits inline with its step. */}
      <GlassStage className="mt-8 lg:hidden">{STEPS[index]?.panel}</GlassStage>
    </div>
  );
}

export function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section id="how" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-6" aria-labelledby="how-title">
      <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <h2 id="how-title" className="heading text-32 font-medium text-hi md:text-48">
            How it works
          </h2>
          <p className="mt-6 max-w-[440px] text-16 text-mid">Three steps, one approval. Nothing reaches your wallet until it has passed every check.</p>
          <ol className="mt-8 hidden gap-1 lg:flex lg:flex-col" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li key={s.title} aria-current={active === i ? "step" : undefined} className="flex items-center gap-4 py-2">
                <span className="relative h-px w-8 overflow-hidden bg-line">
                  <motion.span
                    className="absolute inset-0 origin-left bg-hi"
                    animate={{ scaleX: active === i ? 1 : 0 }}
                    transition={{ duration: 0.5, ease }}
                  />
                </span>
                <span className={`text-16 transition-colors duration-300 ${active === i ? "text-hi" : "text-meta"}`}>{s.title}</span>
              </li>
            ))}
          </ol>
          <GlassStage className="mt-8 hidden lg:block">
            <div className="min-h-[232px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease }}
              >
                {STEPS[active]?.panel}
              </motion.div>
            </AnimatePresence>
            </div>
          </GlassStage>
        </div>

        <div className="flex min-w-0 flex-col gap-16 lg:gap-0">
          {STEPS.map((s, i) => (
            <StepText key={s.title} index={i} title={s.title} onActive={setActive}>
              {s.body}
            </StepText>
          ))}
        </div>
      </div>
    </section>
  );
}
