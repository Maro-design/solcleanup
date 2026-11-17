import Link from "next/link";

/**
 * The mark: an emptied tray with motion lines and one cornflower coin
 * leaving it — the rent coming back. Tile and cut-outs follow the theme
 * (ink tile on paper, paper tile on ink); the coin stays cornflower.
 */
export function LogoMark({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={className}>
      <rect x="1" y="1" width="30" height="30" rx="8.5" fill="var(--text-hi)" />
      <g fill="none" stroke="var(--bg-base)" strokeLinecap="round" strokeLinejoin="round">
        {/* Tray */}
        <path d="M6.5 16.5h2.6l1.9 3.3h10l1.9-3.3h2.6v6.2a2.8 2.8 0 0 1-2.8 2.8H9.3a2.8 2.8 0 0 1-2.8-2.8z" strokeWidth="2.2" />
        {/* Motion lines */}
        <path d="M11 7.6h4.6M9.6 10.2h5.4M10.6 12.8h4.6" strokeWidth="1.5" />
      </g>
      {/* The coin */}
      <circle cx="21.4" cy="10.2" r="4" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-md text-16 font-semibold tracking-[-0.01em] text-hi" aria-label="SolCleanup home">
      <LogoMark size={26} />
      SolCleanup
    </Link>
  );
}
