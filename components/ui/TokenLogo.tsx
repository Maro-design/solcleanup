"use client";

import { useState } from "react";

/** Token logo with a neutral monogram fallback. Plain <img>: hosts vary. */
export function TokenLogo({ src, label, size = 24 }: { src: string | null; label: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = (label.trim()[0] ?? "?").toUpperCase();
  if (!src || failed) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-overlay font-mono text-12 text-meta"
      >
        {initial}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-overlay object-cover"
      style={{ width: size, height: size }}
    />
  );
}
