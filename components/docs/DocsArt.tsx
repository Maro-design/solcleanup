"use client";

/**
 * The whole product in one loop: an empty token account on the left, rent
 * travelling along the arc, landing in the wallet on the right. SMIL keeps the
 * three moving parts on one clock; reduced motion gets the still frame.
 */
import { useReducedMotion } from "framer-motion";
import { Wallet } from "lucide-react";

const DUR = "3.2s";
const ARC = "M150 118 C 210 30, 310 30, 370 118";

export function DocsArt() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 520 190" className="h-auto w-full max-w-[560px]" role="img" aria-label="Rent moving from an empty token account into your wallet">
      {/* Arc */}
      <path d={ARC} fill="none" stroke="var(--border-hover)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 9">
        {!reduce && <animate attributeName="stroke-dashoffset" from="22" to="0" dur="1.2s" repeatCount="indefinite" />}
      </path>

      {/* Empty token account: a card whose balance line reads zero */}
      <g>
        <rect x="58" y="82" width="84" height="64" rx="12" fill="var(--bg-overlay)" stroke="var(--border-hover)" strokeWidth="2" />
        <rect x="48" y="92" width="84" height="64" rx="12" fill="var(--bg-raised)" stroke="var(--text-low)" strokeWidth="2" />
        <circle cx="68" cy="112" r="7" fill="none" stroke="var(--text-low)" strokeWidth="2" />
        <rect x="82" y="108" width="36" height="8" rx="4" fill="var(--border)" />
        <text x="62" y="142" fontFamily="var(--font-geist-mono)" fontSize="13" fill="var(--text-meta)">0.00</text>
      </g>

      {/* Wallet, with a ring that answers each arrival */}
      <g>
        <circle cx="406" cy="124" r="40" fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0">
          {!reduce && (
            <>
              <animate attributeName="r" values="34;34;52" keyTimes="0;0.8;1" dur={DUR} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0;0.5;0" keyTimes="0;0.8;0.84;1" dur={DUR} repeatCount="indefinite" />
            </>
          )}
        </circle>
        <rect x="370" y="88" width="72" height="72" rx="20" fill="var(--bg-raised)" stroke="var(--accent)" strokeWidth="2" />
        <Wallet x={386} y={104} width={40} height={40} strokeWidth={1.75} color="var(--accent-ink)" aria-hidden />
      </g>

      {/* Rent in transit */}
      {reduce ? (
        <circle cx="260" cy="54" r="7" fill="var(--accent)" />
      ) : (
        <g>
          <circle r="7" fill="var(--accent)">
            <animateMotion dur={DUR} repeatCount="indefinite" path={ARC} keyPoints="0;0;1;1" keyTimes="0;0.12;0.8;1" calcMode="linear" />
            <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.12;0.76;0.82;1" dur={DUR} repeatCount="indefinite" />
          </circle>
          <text x="406" y="66" textAnchor="middle" fontFamily="var(--font-geist-mono)" fontSize="13" fill="var(--accent-ink)" opacity="0">
            +0.00204 SOL
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.8;0.86;0.96;1" dur={DUR} repeatCount="indefinite" />
            <animate attributeName="y" values="70;70;62;58;58" keyTimes="0;0.8;0.86;0.96;1" dur={DUR} repeatCount="indefinite" />
          </text>
        </g>
      )}
    </svg>
  );
}
