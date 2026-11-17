"use client";

/**
 * Oversized, low-contrast wordmark that closes every page. Purely decorative
 * (aria-hidden). The row (not each shifted letter) is the in-view trigger, so
 * the letters' starting offset can't push them outside the observer.
 */
import { motion, useReducedMotion, type Variants } from "framer-motion";

const LETTERS = "solcleanup".split("");

const row: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.04 } } };
const letter: Variants = {
  hidden: { y: "40%", opacity: 0 },
  shown: { y: "0%", opacity: 1, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

export function FooterWordmark() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none select-none overflow-hidden">
      <motion.p
        variants={row}
        initial={reduce ? false : "hidden"}
        whileInView="shown"
        viewport={{ once: true, amount: 0.2 }}
        className="flex translate-y-[18%] justify-center whitespace-nowrap px-[2vw] text-[16.5vw] font-semibold leading-[0.8] tracking-[-0.05em] text-[var(--wordmark)]"
      >
        {LETTERS.map((ch, i) => (
          <motion.span key={i} variants={letter} className="inline-block">
            {ch}
          </motion.span>
        ))}
      </motion.p>
    </div>
  );
}
