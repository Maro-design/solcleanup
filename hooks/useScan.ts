"use client";

/** React glue around lib/scan. Cancels stale scans when the owner changes. */
import { useConnection } from "@solana/wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { scanWallet, type ScanProgress, type ScanResult } from "@/lib/scan";
import { decodeError } from "@/lib/errors";

export type ScanState =
  | { status: "idle" }
  | { status: "scanning"; progress: ScanProgress }
  | { status: "done"; result: ScanResult }
  | { status: "error"; message: string };

export function useScan(owner: PublicKey | null, { auto = true } = {}) {
  const { connection } = useConnection();
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const run = useRef(0);

  const scan = useCallback(
    async (target: PublicKey | null = owner) => {
      if (!target) return;
      const id = ++run.current;
      setState({ status: "scanning", progress: { phase: "token", label: "Connecting to Solana", fraction: 0.02 } });
      try {
        const result = await scanWallet(connection, target, (progress) => {
          if (run.current === id) setState({ status: "scanning", progress });
        });
        if (run.current === id) setState({ status: "done", result });
      } catch (e) {
        if (run.current === id) setState({ status: "error", message: decodeError(e) });
      }
    },
    [connection, owner],
  );

  useEffect(() => {
    if (auto && owner) void scan(owner);
    if (!owner) {
      run.current++;
      setState({ status: "idle" });
    }
  }, [owner, auto, scan]);

  return { state, scan };
}
