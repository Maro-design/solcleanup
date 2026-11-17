"use client";

/**
 * Home page: one centred message and one action. Everything else lives on its
 * own page (Scan, How it works, Safety, FAQ, Docs).
 */
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@/components/ui/ConnectButton";
import { useTheme } from "@/lib/theme";

// Lazy: the WebGL background never blocks first paint and ships in its own chunk.
const GradientASCII = dynamic(() => import("@/components/ui/gradient-ascii/GradientASCII"), { ssr: false });

/** Cornflower ramp on paper, from the edge of the light to its brightest point. */
const HERO_COLORS = ["#2f5ec4", "#6495ed", "#a9c3f5", "#dce7fb"];
/** The same ramp lit from below on ink: deep blue at the edge, pale cornflower at the core. */
const HERO_COLORS_DARK = ["#16274d", "#2f5ec4", "#6495ed", "#a9c3f5"];

const HEADLINE = ["Get", "back", "the", "SOL", "sitting", "in", "empty", "token", "accounts"];

export function Hero() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const { scrollY } = useScroll();
  const parallax = useTransform(scrollY, (v) => (reduce ? 0 : v * 0.3));
  const [showField, setShowField] = useState(false);
  const dark = useTheme() === "dark";

  useEffect(() => {
    // Old share links (/?check=<address>) now live on the Scan page.
    const q = new URLSearchParams(window.location.search).get("check");
    if (q) router.replace(`/check?check=${encodeURIComponent(q)}`);
    // Start the ambient canvas once the browser is idle.
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => setShowField(true));
    else setTimeout(() => setShowField(true), 300);
  }, [router]);

  const textDone = 100 + HEADLINE.length * 40;

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden" aria-labelledby="hero-title">
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ y: parallax }}>
        {showField && (
          <GradientASCII
            key={dark ? "dark" : "light"}
            lightMode={!dark}
            colors={dark ? HERO_COLORS_DARK : HERO_COLORS}
            shape="rise"
            characters=" .:-=+xX0#"
            cellSize={16}
            density={0.75}
            glyphOpacity={0.7}
            gradientOpacity={0.55}
            glow={0.15}
            flicker={0.2}
            softness={0.6}
            flow={0.5}
            speed={0.8}
            grain={0.04}
            scrambleRadius={0.08}
            clickEffect="wave"
          />
        )}
        {/* Keep the paper calm behind the headline so the type stays crisp. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_42%,var(--bg-base)_30%,transparent_100%)]" />
      </motion.div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
        {/* CSS keyframes (not JS) so the headline paints before hydration — keeps LCP fast. */}
        <h1 id="hero-title" className="display max-w-[920px] text-48 font-medium text-hi md:text-72">
          {HEADLINE.map((w, i) => (
            <span key={i} className="rise inline-block whitespace-pre" style={{ animationDelay: `${100 + i * 40}ms` }}>
              {w}
              {i < HEADLINE.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>

        <p className="rise mt-6 max-w-[560px] text-20 text-mid" style={{ animationDelay: `${textDone + 80}ms` }}>
          Every token account you&apos;ve emptied still holds rent. Find yours and close them in one approval.
        </p>

        <div id="hero-anchor" className="rise mt-10 flex flex-col items-center gap-4" style={{ animationDelay: `${textDone + 160}ms` }}>
          <ConnectButton variant="primary" size="lg" />
          <Link href="/check" className="group inline-flex h-10 items-center gap-2 rounded-md text-14 text-mid transition-colors hover:text-hi">
            Not ready to connect? Check any wallet first
            <ArrowRight size={16} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
