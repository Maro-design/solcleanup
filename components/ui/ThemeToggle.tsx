"use client";

/**
 * Sun / moon switch. The knob carries the current mode's icon and slides
 * across the track; the other mode's icon waits faintly on the far side.
 */
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { setTheme, useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-line bg-overlay p-1 transition-colors hover:border-line-hover ${className}`}
    >
      {/* Resting icons on the track */}
      <Sun size={14} strokeWidth={1.75} className="absolute left-2.5 text-meta" aria-hidden />
      <Moon size={14} strokeWidth={1.75} className="absolute right-2.5 text-meta" aria-hidden />

      <motion.span
        className="relative z-10 flex size-7 items-center justify-center rounded-full bg-hi text-[var(--bg-base)] shadow-[0_2px_6px_rgb(var(--shadow-ink)/0.25)]"
        initial={false}
        animate={{ x: dark ? 28 : 0, rotate: dark ? 360 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      >
        {dark ? <Moon size={14} strokeWidth={2} aria-hidden /> : <Sun size={14} strokeWidth={2} aria-hidden />}
      </motion.span>
    </button>
  );
}
