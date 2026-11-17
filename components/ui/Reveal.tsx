"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

/** Fade + 24px rise as the block enters the viewport. Once. */
export function Reveal({ delay = 0, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      {...rest}
    />
  );
}
