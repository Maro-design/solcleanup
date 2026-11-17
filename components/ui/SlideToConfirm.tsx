"use client";

/**
 * Slide-to-confirm. Drag the knob to the end (or focus it and press Enter /
 * Space) to fire onConfirm once. Short of 90% it springs back. Changing
 * resetKey returns the knob to the start, e.g. after the flow is cancelled.
 */
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Check, ChevronsRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

const KNOB = 48;
const PAD = 4;

export function SlideToConfirm({
  label,
  onConfirm,
  disabled = false,
  resetKey,
  className = "",
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  resetKey?: unknown;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(0);
  const [done, setDone] = useState(false);
  const x = useMotionValue(0);

  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setMax(Math.max(0, el.clientWidth - KNOB - PAD * 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setDone(false);
    void animate(x, 0, { type: "spring", stiffness: 400, damping: 36 });
  }, [resetKey, x]);

  const fill = useTransform(x, (v) => v + KNOB + PAD);
  const labelOpacity = useTransform(x, [0, Math.max(1, max * 0.55)], [1, 0]);

  const complete = () => {
    if (done || disabled) return;
    setDone(true);
    void animate(x, max, { type: "spring", stiffness: 400, damping: 36 }).then(onConfirm);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      complete();
    }
  };

  return (
    <div
      ref={track}
      className={`relative h-14 select-none overflow-hidden rounded-full border border-line bg-overlay ${disabled ? "opacity-50" : ""} ${className}`}
    >
      {/* Progress fill behind the knob */}
      <motion.div aria-hidden className="absolute inset-y-0 left-0 rounded-full bg-[rgb(100_149_237/0.22)]" style={{ width: fill }} />

      {/* Label, fading as the knob travels */}
      <motion.span
        aria-hidden
        style={{ opacity: labelOpacity }}
        className="slide-shimmer pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-14 font-medium"
      >
        {label}
      </motion.span>

      <motion.button
        type="button"
        aria-label={label}
        disabled={disabled}
        drag={disabled || done ? false : "x"}
        dragConstraints={{ left: 0, right: max }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={() => {
          if (x.get() >= max * 0.9) complete();
          else void animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
        }}
        onKeyDown={onKey}
        style={{ x, width: KNOB, height: KNOB, top: PAD - 1, left: PAD - 1 }}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        className="absolute z-10 flex cursor-grab items-center justify-center rounded-full bg-accent text-[var(--on-accent)] shadow-[0_6px_16px_-4px_rgb(47_94_196/0.6),inset_0_1px_0_rgb(255_255_255/0.3)] active:cursor-grabbing disabled:cursor-not-allowed"
      >
        {done ? <Check size={20} strokeWidth={2.25} aria-hidden /> : <ChevronsRight size={20} strokeWidth={2.25} aria-hidden />}
      </motion.button>
    </div>
  );
}
