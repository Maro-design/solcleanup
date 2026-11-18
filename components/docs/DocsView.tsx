"use client";

/**
 * Docs as a three-column reader: section nav on the left, the page in the
 * middle, "On this page" on the right. Both rails follow the section that is
 * currently being read.
 */
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  EyeOff,
  Layers,
  Receipt,
  ScanSearch,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  FEE_BPS,
  FEE_PERCENT_LABEL,
  FEE_WALLET,
  MAX_CLOSES_PER_TX,
  PRIORITY_FEE_MAX,
  PRIORITY_FEE_MIN,
  PRIORITY_FEE_PERCENTILE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  VALUE_THRESHOLD_USD,
  solscanAccount,
} from "@/lib/config";
import { DocsArt } from "./DocsArt";

const ease = [0.16, 1, 0.3, 1] as const;

type Section = { id: string; title: string; icon: LucideIcon; blurb: string };

const GROUPS: { label: string; items: Section[] }[] = [
  {
    label: "Guides",
    items: [
      { id: "scan", title: "Scanning your wallet", icon: ScanSearch, blurb: "What the scan reads, and from where." },
      { id: "statuses", title: "Account statuses", icon: Tags, blurb: "Empty, dust and protected." },
      { id: "checks", title: "Checks before signing", icon: ShieldCheck, blurb: "Re-reads and simulation, every time." },
    ],
  },
  {
    label: "Under the hood",
    items: [
      { id: "transaction", title: "Transaction anatomy", icon: Layers, blurb: "Every instruction your wallet will show." },
      { id: "fees", title: "Fees", icon: Receipt, blurb: `The ${FEE_PERCENT_LABEL} fee, how it's computed and paid.` },
      { id: "privacy", title: "What leaves your browser", icon: EyeOff, blurb: "Which requests go where." },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.items);

/* ---------- small building blocks ---------- */

function IconTile({ icon: Icon, size = "md" }: { icon: LucideIcon; size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8 rounded-lg" : "size-10 rounded-xl";
  return (
    <span className={`flex shrink-0 items-center justify-center border border-[rgb(100_149_237/0.25)] bg-[rgb(100_149_237/0.1)] text-accent-ink ${box}`}>
      <Icon size={size === "sm" ? 16 : 20} strokeWidth={1.75} aria-hidden />
    </span>
  );
}

function Code({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="mt-6 overflow-hidden rounded-xl border border-line bg-raised">
      <figcaption className="border-b border-line px-4 py-2 font-mono text-12 text-meta">{label}</figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-12 leading-6 text-mid">{children}</pre>
    </figure>
  );
}

function DocSection({ s, children }: { s: Section; children: ReactNode }) {
  return (
    <motion.section
      id={s.id}
      aria-labelledby={`${s.id}-title`}
      className="scroll-mt-28 border-t border-line pt-12"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease }}
    >
      <div className="flex items-center gap-4">
        <IconTile icon={s.icon} />
        <h2 id={`${s.id}-title`} className="heading text-32 font-medium text-hi">
          {s.title}
        </h2>
      </div>
      <div className="mt-6 space-y-4 text-16 leading-7 text-mid [&_p]:max-w-[64ch]">{children}</div>
    </motion.section>
  );
}

const STATUSES: { name: string; dot: string; text: string; closable?: boolean }[] = [
  { name: "Empty", dot: "bg-hi", text: "Raw balance is exactly 0. The only status that can be closed.", closable: true },
  {
    name: "Dust",
    dot: "bg-warn",
    text: `A priced balance worth under $${VALUE_THRESHOLD_USD}. Opt-in: the exact balance is burned, then the account is closed.`,
    closable: true,
  },
  {
    name: "Protected",
    dot: "bg-low",
    text: `Anything worth $${VALUE_THRESHOLD_USD} or more, NFTs, LP and liquid staking tokens, wrapped SOL, frozen accounts, accounts another wallet can close, Token-2022 accounts holding withheld fees, and anything that can't be priced.`,
  },
];

/* ---------- scroll spy ---------- */

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>("overview");
  useEffect(() => {
    const els = ["overview", ...ids].map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const IDS = ALL.map((s) => s.id);

/* ---------- page ---------- */

export function DocsView() {
  const active = useActiveSection(IDS);

  return (
    <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-12 px-6 pb-32 pt-28 lg:grid-cols-[220px_minmax(0,1fr)] lg:pt-36 xl:grid-cols-[220px_minmax(0,1fr)_200px]">
      {/* Left: section nav */}
      <nav aria-label="Docs" className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
        <a href="#overview" className="mb-6 flex items-center gap-3 text-14 font-medium text-hi">
          <IconTile icon={BookOpen} size="sm" />
          Docs
        </a>
        <SideLink id="overview" title="Overview" icon={BookOpen} active={active === "overview"} />
        {GROUPS.map((g) => (
          <div key={g.label} className="mt-6">
            <p className="mb-2 px-3 text-12 text-meta">{g.label}</p>
            {g.items.map((s) => (
              <SideLink key={s.id} id={s.id} title={s.title} icon={s.icon} active={active === s.id} />
            ))}
          </div>
        ))}
      </nav>

      {/* Middle: the page */}
      <main id="main" className="min-w-0">
        <header id="overview" className="scroll-mt-28">
          <h1 className="display text-48 font-medium text-hi md:text-72">Docs</h1>
          <p className="mt-6 max-w-[60ch] text-20 leading-8 text-mid">
            Everything SolCleanup does, end to end: what it reads, what it builds, what it charges and what never leaves your
            browser. Check any of it against what your wallet shows you.
          </p>
          <div className="mt-12 flex justify-center rounded-2xl border border-line bg-raised px-6 py-10">
            <DocsArt />
          </div>
        </header>

        <section aria-labelledby="start-title" className="mt-16">
          <h2 id="start-title" className="heading text-20 font-medium text-hi">
            Start here
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ALL.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease, delay: i * 0.05 }}
              >
                <a
                  href={`#${s.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-raised p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-line-hover hover:shadow-[0_12px_28px_-12px_rgb(20_22_27/0.15)]"
                >
                  <IconTile icon={s.icon} />
                  <span className="mt-5 flex items-center gap-2 text-16 font-medium text-hi">
                    {s.title}
                    <ArrowRight
                      size={16}
                      strokeWidth={1.75}
                      className="-translate-x-1 opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-2 text-14 text-mid">{s.blurb}</span>
                </a>
              </motion.li>
            ))}
          </ul>
        </section>

        <div className="mt-20 space-y-20">
          <DocSection s={ALL[0]!}>
            <p>
              The app calls <code className="font-mono text-14 text-hi">getParsedTokenAccountsByOwner</code> once for each Solana
              token program, then reads every mint those accounts point to.
            </p>
            <Code label="Token programs">{`SPL Token   ${TOKEN_PROGRAM_ID}\nToken-2022  ${TOKEN_2022_PROGRAM_ID}`}</Code>
            <p>
              Prices and token names come from Jupiter and are only fetched for mints that matter: empty accounts and anything with
              a balance.
            </p>
          </DocSection>

          <DocSection s={ALL[1]!}>
            <p>Every account gets exactly one status. Protected is decided first, so a risky account can never look closable.</p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STATUSES.map((st) => (
                <li key={st.name} className="rounded-xl border border-line bg-raised p-5">
                  <p className="flex items-center gap-2 text-14 font-medium text-hi">
                    <span className={`size-2 rounded-full ${st.dot}`} aria-hidden />
                    {st.name}
                    {st.closable && <span className="ml-auto rounded-full bg-hi px-2 py-0.5 text-12 font-normal text-[var(--bg-base)]">Closable</span>}
                  </p>
                  <p className="mt-2 text-14 leading-6 text-mid">{st.text}</p>
                </li>
              ))}
            </ul>
          </DocSection>

          <DocSection s={ALL[2]!}>
            <p>Right before your wallet opens, SolCleanup checks everything again against the live chain:</p>
            <ul className="space-y-3">
              {[
                "Each selected account is re-read: empty ones must still hold zero, dust must still hold exactly the balance you saw.",
                "Each transaction is simulated. One that fails is shown with its decoded error and never reaches your wallet.",
                "The compute limit is taken from that simulation, so you don't overpay for space you don't use.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <ShieldCheck size={18} strokeWidth={1.75} className="mt-1 shrink-0 text-accent-ink" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </DocSection>

          <DocSection s={ALL[3]!}>
            <p>
              Selected accounts are grouped into versioned (v0) transactions of at most {MAX_CLOSES_PER_TX} closes, which keeps each
              one under Solana&apos;s 1,232-byte limit. Every transaction contains, in order:
            </p>
            <Code label="One transaction">
              {`1  ComputeBudget  setComputeUnitLimit   simulated units × 1.15 + 2,000
2  ComputeBudget  setComputeUnitPrice   p${Math.round(PRIORITY_FEE_PERCENTILE * 100)} of recent fees, ${PRIORITY_FEE_MIN.toLocaleString("en-US")}–${PRIORITY_FEE_MAX.toLocaleString("en-US")} µ-lamports
3… Token          burnChecked           dust only: exactly the scanned balance
   Token          closeAccount          account → your wallet (authority: you)
n  System         transfer              your wallet → fee wallet`}
            </Code>
            <p>All instructions succeed together, or none of them do.</p>
          </DocSection>

          <DocSection s={ALL[4]!}>
            <p>
              The service fee is {FEE_PERCENT_LABEL} ({FEE_BPS} basis points) of the rent each transaction returns, rounded down to
              the lamport:
            </p>
            <Code label="Fee formula">{`fee = floor(rentReturnedInThisTransaction × ${FEE_BPS} / 10,000)`}</Code>
            <p>
              It is a transfer inside the same transaction as the closes, so it only settles if they do. It goes to the public
              service fee wallet:
            </p>
            <a
              href={solscanAccount(FEE_WALLET)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-raised px-4 py-3 font-mono text-12 text-hi transition-colors hover:border-line-hover sm:text-14"
            >
              <span className="min-w-0 break-all">{FEE_WALLET}</span>
              <ArrowUpRight size={16} strokeWidth={1.75} className="shrink-0 text-meta transition-colors group-hover:text-hi" aria-hidden />
            </a>
            <p>The network fee (5,000 lamports per signature plus the priority fee) goes to Solana validators, not to SolCleanup.</p>
          </DocSection>

          <DocSection s={ALL[5]!}>
            <ul className="space-y-3">
              {[
                "RPC requests for your accounts go to the configured Solana RPC.",
                "Price and token-name lookups send only public mint addresses to Jupiter, never your wallet address.",
                "No analytics, no backend and no storage of wallet contents.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <EyeOff size={18} strokeWidth={1.75} className="mt-1 shrink-0 text-accent-ink" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </DocSection>
        </div>
      </main>

      {/* Right: on this page */}
      <aside aria-label="On this page" className="hidden xl:sticky xl:top-28 xl:block xl:self-start">
        <p className="mb-3 text-12 text-meta">On this page</p>
        <ul className="relative border-l border-line">
          {ALL.map((s) => (
            <li key={s.id} className="relative">
              {active === s.id && (
                <motion.span layoutId="toc-bar" className="absolute -left-px top-0 h-full w-0.5 rounded-full bg-accent" transition={{ duration: 0.35, ease }} />
              )}
              <a href={`#${s.id}`} className={`block py-1.5 pl-4 text-14 transition-colors ${active === s.id ? "text-hi" : "text-meta hover:text-hi"}`}>
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function SideLink({ id, title, icon: Icon, active }: { id: string; title: string; icon: LucideIcon; active: boolean }) {
  return (
    <a
      href={`#${id}`}
      aria-current={active ? "location" : undefined}
      className={`relative isolate flex items-center gap-3 rounded-lg px-3 py-2 text-14 transition-colors ${active ? "text-hi" : "text-mid hover:text-hi"}`}
    >
      {active && (
        <motion.span
          layoutId="side-pill"
          className="absolute inset-0 -z-10 rounded-lg border border-[rgb(100_149_237/0.25)] bg-[rgb(100_149_237/0.1)]"
          transition={{ duration: 0.35, ease }}
        />
      )}
      <Icon size={16} strokeWidth={1.75} className={active ? "text-accent-ink" : "text-meta"} aria-hidden />
      {title}
    </a>
  );
}
