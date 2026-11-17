"use client";

/**
 * Transparent at the top; blurred with a hairline after 40px of scroll.
 * Desktop: a centred GooeyNav whose active pill follows the page (and, on the
 * landing page, the section in view). Below lg the links collapse into a
 * menu button (no hover-only affordances).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ConnectButton } from "@/components/ui/ConnectButton";
import GooeyNav, { type GooeyNavItem } from "@/components/ui/gooey/GooeyNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FEE_WALLET, solscanAccount } from "@/lib/config";
import { useTheme } from "@/lib/theme";

/** One page per topic; the pill marks the page you are on. */
/** Shown only while a wallet is connected. */
const APP_PAGE: GooeyNavItem = { label: "App", href: "/app" };
const PORTFOLIO_PAGE: GooeyNavItem = { label: "Portfolio", href: "/portfolio" };

const PAGES: GooeyNavItem[] = [
  { label: "Home", href: "/" },
  { label: "Scan", href: "/check" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Rewards", href: "/rewards" },
  { label: "FAQ", href: "/faq" },
  { label: "Docs", href: "/docs" },
];

function pagesFor(connected: boolean): GooeyNavItem[] {
  if (!connected) return PAGES;
  const [home, ...rest] = PAGES;
  return [home!, APP_PAGE, ...rest, PORTFOLIO_PAGE];
}

function pageIndex(pages: GooeyNavItem[], pathname: string): number {
  const i = pages.findIndex((p) => p.href !== "/" && pathname.startsWith(p.href ?? ""));
  return i === -1 ? 0 : i;
}

/** Palette-matched theme for the vendored GooeyNav. */
const GOOEY_STYLE = {
  "--gn-frame": "var(--frame)",
  "--gn-frame-edge": "var(--frame-edge)",
  "--gn-frame-highlight": "var(--frame-highlight)",
  "--gn-frame-shadow": "0 16px 32px -16px rgb(var(--shadow-ink) / 0.18)",
  "--gn-ink": "var(--text-hi)",
  "--gn-muted": "var(--text-mid)",
  "--gn-pad": "4px",
  "--gn-gap": "2px",
  "--gn-font": "14px",
  "--gn-x": "14px",
  "--gn-y": "8px",
} as const;

/** Frosted frame matching the GooeyNav pill, shown on the side islands once the page scrolls. */
function island(on: boolean): string {
  return `transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
    on
      ? "bg-[var(--frame)] shadow-[inset_0_0_0_1px_var(--frame-edge),0_16px_32px_-16px_rgb(var(--shadow-ink)/0.18)] backdrop-blur-xl"
      : "bg-transparent shadow-none"
  }`;
}

export function Nav() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { publicKey } = useWallet();
  const pages = useMemo(() => pagesFor(!!publicKey), [publicKey]);
  const [active, setActive] = useState(() => pageIndex(pages, pathname));
  /** The page a click is taking us to, until the route actually changes. */
  const [pending, setPending] = useState<string | null>(null);
  const pendingTimer = useRef<number | null>(null);

  // The pill always ends up on the page that is really showing: when the route
  // changes, or when a navigation never lands (slow load, interrupted click).
  useEffect(() => {
    setActive(pageIndex(pages, pathname));
    setPending(null);
    if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
  }, [pages, pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const router = useRouter();
  const theme = useTheme();
  const onChange = useCallback((index: number) => setActive(index), []);

  // Load every page in the background so tab clicks switch instantly.
  useEffect(() => {
    for (const p of pages) if (p.href?.startsWith("/")) router.prefetch(p.href);
  }, [pages, router]);

  // GooeyNav renders plain <a> tags; route same-origin clicks client-side so the
  // wallet connection and page state survive (modifier clicks still open tabs).
  const onNavClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      e.preventDefault();
      if (href === pathname) return;
      setPending(href);
      router.push(href);
      // Safety net: if the page hasn't arrived after 8s, put the pill back.
      if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
      pendingTimer.current = window.setTimeout(() => {
        setPending(null);
        setActive(pageIndex(pages, window.location.pathname));
      }, 8000);
    },
    [router, pathname, pages],
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        open ? "border-line bg-[var(--frame-solid)] backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <AnimatePresence>
        {pending && (
          <motion.div
            key="route-progress"
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-accent"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 0.85, transition: { duration: 2.5, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.3 } }}
          />
        )}
      </AnimatePresence>
      {/* No full-width bar on scroll: the logo and actions float as their own framed islands, like the pill nav. */}
      <div className="relative mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-6">
        <div className={`-ml-3 rounded-full px-3 py-2 ${island(scrolled && !open)}`}>
          <Logo />
        </div>

        <div
          className="hidden min-w-0 flex-1 justify-center xl:flex"
          onClickCapture={onNavClick}
        >
          <GooeyNav
            ariaLabel="Main"
            key={pages.length}
            items={pages}
            activeIndex={active}
            onChange={onChange}
            theme={theme}
            color={theme === "dark" ? "#F3F1EA" : "#14161B"}
            activeTextColor={theme === "dark" ? "#0E1014" : "#F7F5EF"}
            particleCount={12}
            spread={40}
            animationTime={560}
            gooeyness={0.5}
            wobble={0.35}
            style={GOOEY_STYLE}
          />
        </div>

        <div className={`-mr-1 flex items-center gap-2 rounded-full p-1 ${island(scrolled && !open)}`}>
          <a
            href={solscanAccount(FEE_WALLET)}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 rounded-full px-3 py-2 text-14 text-mid transition-colors hover:text-hi xl:inline-flex"
          >
            Fee wallet
            <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
          </a>
          <ThemeToggle />
          <ConnectButton size="sm" compact className="rounded-full!" />
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg text-mid hover:text-hi xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="border-t border-line px-6 py-2 xl:hidden"
          >
            <ul>
              {[...pages, { label: "Fee wallet", href: solscanAccount(FEE_WALLET) }].map((l) => {
                const external = l.href?.startsWith("http");
                return (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      onClick={() => setOpen(false)}
                      className="flex h-12 items-center gap-2 text-16 text-mid hover:text-hi"
                    >
                      {l.label}
                      {external && <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
