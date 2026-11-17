"use client";

/**
 * SOL reclaimed over time, one bar per day / month / year. Single series, so
 * no legend (the card title names it). Bars grow from the baseline on load
 * and on every range change; hover or focus a bar for its exact numbers.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatSol } from "@/lib/format";

export type Range = "day" | "month" | "year";

export interface ClaimPoint {
  time: number; // unix seconds
  receivedLamports: number;
  closed: number;
  burned: number;
}

interface Bucket {
  key: string;
  label: string;
  long: string;
  lamports: number;
  claims: number;
  closed: number;
}

const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 48 };

function buckets(points: ClaimPoint[], range: Range): Bucket[] {
  const now = new Date();
  const out: Bucket[] = [];
  if (range === "day") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push({
        key: d.toDateString(),
        label: d.toLocaleDateString("en-US", { day: "numeric" }),
        long: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        lamports: 0,
        claims: 0,
        closed: 0,
      });
    }
  } else if (range === "month") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        long: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        lamports: 0,
        claims: 0,
        closed: 0,
      });
    }
  } else {
    const first = points.length ? Math.min(...points.map((p) => new Date(p.time * 1000).getFullYear())) : now.getFullYear();
    const start = Math.min(first, now.getFullYear() - 4);
    for (let y = start; y <= now.getFullYear(); y++) out.push({ key: String(y), label: String(y), long: String(y), lamports: 0, claims: 0, closed: 0 });
  }
  const index = new Map(out.map((b, i) => [b.key, i]));
  for (const p of points) {
    const d = new Date(p.time * 1000);
    const k = range === "day" ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString() : range === "month" ? `${d.getFullYear()}-${d.getMonth()}` : String(d.getFullYear());
    const i = index.get(k);
    const b = i === undefined ? undefined : out[i];
    if (!b) continue;
    b.lamports += Math.max(0, p.receivedLamports);
    b.claims += 1;
    b.closed += p.closed;
  }
  return out;
}

/** A "nice" axis max and 3 gridline values. */
function scaleMax(v: number): number {
  if (v <= 0) return 0.01e9;
  const exp = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * exp >= v) ?? 10;
  return step * exp;
}

export function ClaimsChart({ points, range }: { points: ClaimPoint[]; range: Range }) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => buckets(points, range), [points, range]);
  const max = scaleMax(Math.max(0, ...data.map((b) => b.lamports)));
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(40, slot - 2)); // 2px surface gap between bars
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const labelEvery = data.length > 15 ? 5 : 1;
  const empty = data.every((b) => b.lamports === 0);
  const h = hover === null ? null : data[hover];

  return (
    <div ref={wrap} className="relative" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label={`SOL reclaimed per ${range}`} className="block overflow-visible">
        {/* Recessive grid + y labels */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(max * f)} y2={y(max * f)} stroke="var(--border)" strokeDasharray={f === 0 ? undefined : "2 4"} />
            <text x={PAD.left - 8} y={y(max * f)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--text-meta)" fontFamily="var(--font-geist-mono)">
              {formatSol(max * f, max < 0.1e9 ? 3 : 2)}
            </text>
          </g>
        ))}

        <AnimatePresence initial>
          {data.map((b, i) => {
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const top = y(b.lamports);
            const hgt = Math.max(0, PAD.top + innerH - top);
            return (
              <g key={`${range}-${b.key}`}>
                {/* Hit target: the whole column, bigger than the bar */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={b.claims > 0 ? 0 : -1}
                  aria-label={`${b.long}: ${formatSol(b.lamports)} SOL from ${b.claims} claims`}
                />
                {hgt > 0 && (
                  <motion.path
                    d={(() => {
                      const r = Math.min(4, hgt, barW / 2); // 4px rounded data-end, flat on the baseline
                      return `M${x},${PAD.top + innerH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${PAD.top + innerH} Z`;
                    })()}
                    fill="var(--chart-bar)"
                    opacity={hover === null || hover === i ? 1 : 0.45}
                    style={{ transformOrigin: `${x + barW / 2}px ${PAD.top + innerH}px`, pointerEvents: "none" }}
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : i * 0.02 }}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={PAD.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-meta)">
                    {b.label}
                  </text>
                )}
              </g>
            );
          })}
        </AnimatePresence>
      </svg>

      {empty && (
        <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-14 text-meta">No claims in this period yet</p>
      )}

      {/* Tooltip */}
      {h && h.claims > 0 && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-xl border border-line bg-raised px-3 py-2 text-12 shadow-[0_12px_28px_-12px_rgb(var(--shadow-ink)/0.35)]"
          style={{ left: Math.min(width - 80, Math.max(80, PAD.left + hover * slot + slot / 2)) }}
        >
          <p className="text-meta">{h.long}</p>
          <p className="mt-1 font-mono text-14 text-hi tnum">{formatSol(h.lamports)} SOL</p>
          <p className="text-mid tnum">
            {h.claims} {h.claims === 1 ? "claim" : "claims"} · {h.closed} accounts
          </p>
        </div>
      )}
    </div>
  );
}
