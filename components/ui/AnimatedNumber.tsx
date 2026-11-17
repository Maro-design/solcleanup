"use client";

/**
 * Counts up on first view and tweens on every change. Tabular figures keep
 * the width stable while digits move. Reduced motion → jumps to the value.
 */
import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

interface Props {
  value: number;
  format: (n: number) => string;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({ value, format, className, duration = 0.9 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const current = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!inView) {
      el.textContent = format(current.current);
      return;
    }
    if (reduce) {
      current.current = value;
      el.textContent = format(value);
      return;
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v;
        el.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, inView, reduce, format, duration]);

  return (
    <span ref={ref} className={`tnum ${className ?? ""}`} aria-label={format(value)}>
      {format(0)}
    </span>
  );
}
