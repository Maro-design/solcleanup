"use client";

/**
 * FAQ with real <details>/<summary> semantics. Height animates on open and
 * close: the summary click is intercepted so the panel can animate out
 * before `open` is removed. Without JS it still works as plain <details>.
 */
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FEE_WALLET, solscanAccount } from "@/lib/config";
import { FAQ_ITEMS } from "@/lib/content/faq";
import { Reveal } from "@/components/ui/Reveal";


function Item({ q, a }: { q: string; a: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const onSummary = (e: MouseEvent) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    if (!open) {
      el.open = true;
      setOpen(true);
    } else {
      setOpen(false);
      if (reduce) el.open = false;
    }
  };

  return (
    <details ref={ref} className="group border-b border-line">
      <summary
        onClick={onSummary}
        className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-16 text-hi [&::-webkit-details-marker]:hidden"
      >
        {q}
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="shrink-0 text-meta" aria-hidden>
          <Plus size={16} strokeWidth={1.5} />
        </motion.span>
      </summary>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          if (!open && ref.current) ref.current.open = false;
        }}
        className="overflow-hidden"
      >
        <p className="max-w-[720px] pb-6 text-14 text-mid">{a}</p>
      </motion.div>
    </details>
  );
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-6" aria-labelledby="faq-title">
      <div className="grid items-start gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <h1 id="faq-title" className="heading text-32 font-medium text-hi md:text-48">
            Questions
          </h1>
          <p className="mt-6 max-w-[360px] text-16 text-mid">
            Still unsure? Everything SolCleanup does is documented, and the fee wallet is public.
          </p>
          <ul className="mt-6 space-y-1 text-14">
            <li>
              <Link href="/docs" className="inline-flex h-10 items-center gap-2 rounded-md text-hi underline decoration-line-hover underline-offset-4 hover:decoration-mid">
                Read how it works, step by step
              </Link>
            </li>
            <li>
              <a href={solscanAccount(FEE_WALLET)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md text-hi underline decoration-line-hover underline-offset-4 hover:decoration-mid">
                View the fee wallet on Solscan
                <ArrowUpRight size={16} strokeWidth={1.5} className="text-meta" aria-hidden />
              </a>
            </li>
          </ul>
        </Reveal>
        <Reveal delay={0.08} className="border-t border-line">
          {FAQ_ITEMS.map((i) => (
            <Item key={i.q} {...i} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
