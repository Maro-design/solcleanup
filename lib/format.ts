import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/** Lamports → SOL as a number. Precise enough for display (< 2^53 lamports). */
export const toSol = (lamports: number): number => lamports / LAMPORTS_PER_SOL;

/** Fixed-digit SOL string, e.g. "0.2447". */
export function formatSol(lamports: number, digits = 4): string {
  return toSol(lamports).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** USD string. Small values keep cents; null renders as an em dash. */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.01) return "<$0.01";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Token balance with sensible precision. */
export function formatAmount(value: number): string {
  if (value === 0) return "0";
  if (value < 0.0001) return value.toExponential(2);
  return value.toLocaleString("en-US", { maximumFractionDigits: value < 1 ? 6 : 2 });
}

/** "HXFZ…hamp" */
export function shortAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}
